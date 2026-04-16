import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Box, Item, AppSettings, ToastMessage, ToastType, NFCLookupResult, DashboardStats, SyncConfig } from '../types';
import { pushToSupabase, pullFromSupabase, pushPhotosToStorage, isStorageUrl, type SyncResult } from '../lib/sync';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase-config';
import {
  idbStorage, getIDBStorageSize,
  saveItemPhotos, saveAllPhotos, loadAllPhotos, deleteItemPhotos, clearAllItemPhotos,
} from '../lib/idb-storage';

// Referencia al set de Zustand para usarla en onRehydrateStorage (se asigna en la factory)
let _storeSet: ((partial: Partial<StoreState>) => void) | null = null;

interface StoreState {
  // Datos
  boxes: Box[];
  items: Item[];
  settings: AppSettings;
  toasts: ToastMessage[];

  // Acciones de cajas
  addBox: (box: Omit<Box, 'id' | 'createdAt'>) => Box;
  updateBox: (id: string, updates: Partial<Omit<Box, 'id' | 'createdAt'>>) => void;
  deleteBox: (id: string) => boolean; // false si tiene items
  getBox: (id: string) => Box | undefined;
  getBoxItems: (boxId: string) => Item[];

  // Acciones de items
  addItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => Item;
  updateItem: (id: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => Item | undefined;
  moveItem: (itemId: string, newBoxId: string) => void;

  // Configuración
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Toasts
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  // Búsqueda NFC/QR
  findByNfcUid: (uid: string) => NFCLookupResult;
  searchItems: (query: string) => Item[];

  // Estadísticas
  getStats: () => DashboardStats;

  // Importar / Exportar / Limpiar
  importData: (data: { boxes: Box[]; items: Item[] }, replace?: boolean) => void;
  clearAllData: () => void;

  // Sincronización con Supabase
  setSyncConfig: (config: SyncConfig) => void;
  pushToCloud: () => Promise<SyncResult>;
  pullFromCloud: (silent?: boolean) => Promise<SyncResult>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
    _storeSet = (partial) => set(partial as StoreState);
    return {
      boxes: [],
      items: [],
      settings: {
        darkMode: false,
        appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://boxsell.app',
        sync: {
          supabaseUrl:     SUPABASE_URL,
          supabaseAnonKey: SUPABASE_ANON_KEY,
          userKey:         '',
          enabled:         false,
          lastSyncAt:      '',
        },
      },
      toasts: [],

      // ─── Cajas ───────────────────────────────────────────────────────────────

      addBox: (boxData) => {
        const newBox: Box = {
          ...boxData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ boxes: [...state.boxes, newBox] }));
        return newBox;
      },

      updateBox: (id, updates) => {
        set((state) => ({
          boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }));
      },

      deleteBox: (id) => {
        const hasItems = get().items.some((i) => i.boxId === id);
        if (hasItems) return false;
        set((state) => ({ boxes: state.boxes.filter((b) => b.id !== id) }));
        return true;
      },

      getBox: (id) => get().boxes.find((b) => b.id === id),

      getBoxItems: (boxId) => get().items.filter((i) => i.boxId === boxId),

      // ─── Items ────────────────────────────────────────────────────────────────

      addItem: (itemData) => {
        const now = new Date().toISOString();
        const newItem: Item = {
          ...itemData,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        if (newItem.photos.length > 0) {
          saveItemPhotos(newItem.id, newItem.photos).catch(console.error);
        }
        set((state) => ({ items: [...state.items, newItem] }));
        return newItem;
      },

      updateItem: (id, updates) => {
        if (updates.photos !== undefined) {
          saveItemPhotos(id, updates.photos).catch(console.error);
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, ...updates, updatedAt: new Date().toISOString() }
              : i
          ),
        }));
      },

      deleteItem: (id) => {
        deleteItemPhotos(id).catch(console.error);
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      getItem: (id) => get().items.find((i) => i.id === id),

      moveItem: (itemId, newBoxId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId
              ? { ...i, boxId: newBoxId, updatedAt: new Date().toISOString() }
              : i
          ),
        }));
      },

      // ─── Configuración ────────────────────────────────────────────────────────

      updateSettings: (updates) => {
        set((state) => ({ settings: { ...state.settings, ...updates } }));
      },

      // ─── Toasts ───────────────────────────────────────────────────────────────

      addToast: (message, type = 'info') => {
        const id = crypto.randomUUID();
        const toast: ToastMessage = { id, message, type };
        set((state) => ({ toasts: [...state.toasts, toast] }));
        // Auto-eliminar después de 3.5s
        setTimeout(() => {
          get().removeToast(id);
        }, 3500);
      },

      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      // ─── Búsqueda ─────────────────────────────────────────────────────────────

      findByNfcUid: (uid) => {
        const { boxes, items } = get();
        const normalizedUid = uid.toLowerCase().trim();

        const box = boxes.find((b) => b.nfcUid.toLowerCase().trim() === normalizedUid);
        if (box) return { type: 'box', id: box.id };

        const item = items.find((i) => i.nfcUid.toLowerCase().trim() === normalizedUid);
        if (item) return { type: 'item', id: item.id };

        return null;
      },

      searchItems: (query) => {
        if (!query.trim()) return get().items;
        const q = query.toLowerCase();
        const { items, boxes } = get();
        return items.filter((i) => {
          const box = boxes.find((b) => b.id === i.boxId);
          return (
            i.name.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.tags.some((t) => t.toLowerCase().includes(q)) ||
            box?.name.toLowerCase().includes(q)
          );
        });
      },

      // ─── Estadísticas ─────────────────────────────────────────────────────────

      getStats: () => {
        const { items, boxes } = get();
        const soldItems = items.filter((i) => i.status === 'sold');
        const stockItems = items.filter((i) => i.status === 'stock');
        const reservedItems = items.filter((i) => i.status === 'reserved');
        const draftItems = items.filter((i) => i.status === 'draft');

        return {
          totalItems: items.length,
          stockItems: stockItems.length,
          reservedItems: reservedItems.length,
          soldItems: soldItems.length,
          draftItems: draftItems.length,
          totalBoxes: boxes.length,
          totalRevenue: soldItems.reduce((sum, i) => sum + (i.soldPrice || 0), 0),
          pendingRevenue:
            [...stockItems, ...reservedItems].reduce((sum, i) => sum + (i.price || 0), 0),
        };
      },

      // ─── Import / Export / Clear ──────────────────────────────────────────────

      importData: (data, replace = false) => {
        // Guardar fotos en IDB en background (fire-and-forget, no bloquea la UI)
        const photosMap: Record<string, string[]> = {};
        for (const item of data.items) {
          if (item.photos?.length > 0) photosMap[item.id] = item.photos;
        }
        if (Object.keys(photosMap).length > 0) {
          saveAllPhotos(photosMap).catch(console.error);
        }
        set((state) => ({
          boxes: replace ? data.boxes : [...state.boxes, ...data.boxes],
          items: replace ? data.items : [...state.items, ...data.items],
        }));
      },

      clearAllData: () => {
        clearAllItemPhotos().catch(console.error);
        set({ boxes: [], items: [] });
      },

      // ─── Sync con Supabase ────────────────────────────────────────────────────

      setSyncConfig: (config) => {
        set((state) => ({ settings: { ...state.settings, sync: config } }));
      },

      pushToCloud: async () => {
        const { boxes, items, settings, addToast } = get();
        const sync = settings.sync;
        if (!sync?.enabled || !sync.supabaseUrl || !sync.supabaseAnonKey || !sync.userKey) {
          return { ok: false, error: 'Sync no configurado o deshabilitado.' };
        }

        // 1. Subir fotos base64 a Storage y obtener URLs públicas
        const photosMap = await loadAllPhotos();
        let itemsWithPhotos = items;

        const hasBase64 = Object.values(photosMap).some(p => p.some(f => f && !isStorageUrl(f)));
        if (hasBase64) {
          addToast('Subiendo fotos a la nube...', 'info');
          const photoResult = await pushPhotosToStorage(
            sync.supabaseUrl, sync.supabaseAnonKey, sync.userKey, photosMap,
            (done, total) => { if (done === total) addToast(`${total} fotos subidas ✓`, 'success'); },
          );
          if (photoResult.ok) {
            // Guardar URLs en IDB y en memoria (reemplaza base64)
            await saveAllPhotos(photoResult.urlMap);
            itemsWithPhotos = items.map(i => ({
              ...i,
              photos: photoResult.urlMap[i.id] ?? i.photos,
            }));
            set({ items: itemsWithPhotos });
          }
        } else if (Object.keys(photosMap).length > 0) {
          // Fotos ya son URLs → inyectarlas en items para el push
          itemsWithPhotos = items.map(i => ({
            ...i,
            photos: photosMap[i.id] ?? [],
          }));
        }

        // 2. Subir items (con URLs de Storage en photos) + cajas a Supabase
        const result = await pushToSupabase(
          sync.supabaseUrl, sync.supabaseAnonKey, sync.userKey,
          boxes, itemsWithPhotos,
        );
        if (!result.ok) {
          addToast(`Error al subir: ${result.error}`, 'error');
          return result;
        }

        set((state) => ({
          settings: {
            ...state.settings,
            sync: { ...state.settings.sync!, lastSyncAt: result.updatedAt },
          },
        }));
        addToast('Datos sincronizados en la nube ✓', 'success');
        return result;
      },

      pullFromCloud: async (silent = false) => {
        const { settings, addToast } = get();
        const sync = settings.sync;
        if (!sync?.enabled || !sync.supabaseUrl || !sync.supabaseAnonKey || !sync.userKey) {
          return { ok: false, error: 'Sync no configurado o deshabilitado.' };
        }
        const result = await pullFromSupabase(sync.supabaseUrl, sync.supabaseAnonKey, sync.userKey);
        if (result.ok) {
          // Los items traen las URLs de Storage directamente en photos.
          // Guardar en IDB para que estén disponibles tras reiniciar la app.
          const urlsToSave: Record<string, string[]> = {};
          for (const item of result.payload.items) {
            if (item.photos?.length) urlsToSave[item.id] = item.photos;
          }
          if (Object.keys(urlsToSave).length > 0) {
            await saveAllPhotos(urlsToSave);
          }

          const mergedItems = result.payload.items.map((item) => ({
            ...item,
            photos: item.photos ?? [],
          }));
          set((state) => ({
            boxes: result.payload.boxes,
            items: mergedItems,
            settings: {
              ...state.settings,
              sync: { ...state.settings.sync!, lastSyncAt: new Date().toISOString() },
            },
          }));
          if (!silent) addToast('Datos descargados de la nube ✓', 'success');
          return { ok: true, updatedAt: result.payload.updated_at };
        } else {
          // "Sin datos aún" no es un error — simplemente la nube está vacía
          const isEmptyCloud = result.error.includes('No hay datos');
          if (!silent) {
            if (isEmptyCloud) {
              addToast('La nube está vacía. Sube tus datos desde el móvil primero.', 'info');
            } else {
              addToast(`Error al descargar: ${result.error}`, 'error');
            }
          }
          return { ok: false, error: result.error };
        }
      },
    };
  },
    {
      name: 'boxsell-storage',
      storage: createJSONStorage(() => idbStorage),
      // Fotos excluidas del estado serializado → se guardan en IDB photos store aparte
      partialize: (state) => ({
        boxes: state.boxes,
        items: state.items.map((i) => ({ ...i, photos: [] as string[] })),
        settings: state.settings,
      }),
      // Al hidratar: restaurar fotos desde IDB photos store al estado en memoria
      onRehydrateStorage: () => async (state) => {
        if (!state || !_storeSet) return;

        const photosMap = await loadAllPhotos();

        // Caso migración desde localStorage: items tienen fotos embebidas pero IDB photos store está vacío
        const hasEmbeddedPhotos = state.items.some((i) => (i.photos?.length ?? 0) > 0);
        if (hasEmbeddedPhotos && Object.keys(photosMap).length === 0) {
          const migrationMap: Record<string, string[]> = {};
          for (const item of state.items) {
            if (item.photos?.length > 0) migrationMap[item.id] = item.photos;
          }
          await saveAllPhotos(migrationMap).catch(console.error);
          // Forzar re-persist sin fotos en keyval (partialize las eliminará)
          _storeSet({ items: [...state.items] });
          console.info('[BoxSell] Fotos migradas a IDB photos store ✓');
          return;
        }

        // Caso normal: inyectar fotos desde IDB photos store al estado en memoria
        if (Object.keys(photosMap).length > 0) {
          _storeSet({
            items: state.items.map((item) => ({
              ...item,
              photos: photosMap[item.id] ?? [],
            })),
          });
        }
      },
    }
  )
);

// ─── Helpers externos ──────────────────────────────────────────────────────────

/** Calcula el tamaño aproximado del almacenamiento en bytes (async, IndexedDB) */
export async function getStorageSize(): Promise<number> {
  return getIDBStorageSize();
}

/** Formatea bytes a KB/MB legible */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

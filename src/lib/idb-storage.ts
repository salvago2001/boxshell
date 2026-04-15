/**
 * idb-storage.ts
 * Adaptador IndexedDB para Zustand persist + almacén separado de fotos.
 *
 * Estructura de la BD (boxsell-db v2):
 *   keyval      — estado de Zustand serializado (sin fotos, < 1 MB siempre)
 *   item-photos — fotos por item { [itemId]: string[] }  (cientos de MB)
 *
 * Ventajas frente a localStorage:
 *   - Sin límite de 5 MB
 *   - Fotos en store propio → el estado de Zustand permanece ligero
 *   - Migración automática desde localStorage al primer arranque
 */

const DB_NAME      = 'boxsell-db';
const STORE_NAME   = 'keyval';
const PHOTOS_STORE = 'item-photos';
const DB_VERSION   = 2;

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME))   db.createObjectStore(STORE_NAME);
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) db.createObjectStore(PHOTOS_STORE);
    };
    req.onsuccess = () => { _db = req.result; resolve(req.result); };
    req.onerror   = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloqueado por otra pestaña'));
  });
}

// ─── keyval (Zustand persist) ─────────────────────────────────────────────────

async function idbGet(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─── Fotos por item ───────────────────────────────────────────────────────────

/** Guarda las fotos de un item en IDB (reemplaza si ya existían) */
export async function saveItemPhotos(itemId: string, photos: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(PHOTOS_STORE, 'readwrite').objectStore(PHOTOS_STORE).put(photos, itemId);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Guarda las fotos de múltiples items en una sola transacción (eficiente para importación) */
export async function saveAllPhotos(photosMap: Record<string, string[]>): Promise<void> {
  const entries = Object.entries(photosMap).filter(([, p]) => p.length > 0);
  if (entries.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(PHOTOS_STORE, 'readwrite');
    const store = tx.objectStore(PHOTOS_STORE);
    for (const [id, photos] of entries) store.put(photos, id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Carga todas las fotos como mapa { itemId → string[] } */
export async function loadAllPhotos(): Promise<Record<string, string[]>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const result: Record<string, string[]> = {};
    const req = db.transaction(PHOTOS_STORE, 'readonly').objectStore(PHOTOS_STORE).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { result[cursor.key as string] = cursor.value as string[]; cursor.continue(); }
      else          resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Elimina las fotos de un item */
export async function deleteItemPhotos(itemId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(PHOTOS_STORE, 'readwrite').objectStore(PHOTOS_STORE).delete(itemId);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Elimina todas las fotos (para clearAllData) */
export async function clearAllItemPhotos(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(PHOTOS_STORE, 'readwrite').objectStore(PHOTOS_STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─── Adaptador Zustand ────────────────────────────────────────────────────────

/**
 * Storage adapter compatible con createJSONStorage de Zustand.
 * getItem migra automáticamente desde localStorage si IDB está vacío.
 */
export const idbStorage = {
  async getItem(name: string): Promise<string | null> {
    let value = await idbGet(name);
    if (value === null) {
      try {
        const lsValue = localStorage.getItem(name);
        if (lsValue !== null) {
          await idbSet(name, lsValue);
          localStorage.removeItem(name);
          value = lsValue;
          console.info('[BoxSell] Datos migrados de localStorage → IndexedDB ✓');
        }
      } catch { /* localStorage no disponible en algunos contextos */ }
    }
    return value;
  },
  setItem: idbSet,
  removeItem: idbDel,
};

// ─── Tamaño ───────────────────────────────────────────────────────────────────

/** Tamaño aproximado del almacenamiento en bytes */
export async function getIDBStorageSize(): Promise<number> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { usage } = await navigator.storage.estimate();
      return usage ?? 0;
    }
    const value = await idbGet('boxsell-storage');
    return value ? new Blob([value]).size : 0;
  } catch {
    return 0;
  }
}

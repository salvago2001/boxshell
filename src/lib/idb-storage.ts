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
  try {
    const db = await openDB();
    const result = await new Promise<string | null>((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
    const size = result ? new Blob([result]).size : 0;
    console.info(`[IDB] GET ${key} → ${result === null ? 'null' : `${size} bytes`}`);
    return result;
  } catch (err) {
    console.error(`[IDB] GET ${key} FAILED:`, err);
    throw err;
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  const size = new Blob([value]).size;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      // durability:'strict' garantiza que oncomplete no dispara hasta que los datos
      // están físicamente en disco. Sin esto, un hard-refresh (Ctrl+Shift+R) puede
      // leer el estado ANTERIOR porque la escritura quedó en el buffer del navegador
      // pero no llegó a disco antes de que el proceso se recargara.
      const tx = db.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
      const req = tx.objectStore(STORE_NAME).put(value, key);
      req.onsuccess = () => {};
      req.onerror   = () => reject(req.error);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
      tx.onabort    = () => reject(tx.error ?? new Error('IDB transaction aborted'));
    });
    console.info(`[IDB] SET ${key} ← ${size} bytes ✓`);
  } catch (err) {
    console.error(`[IDB] SET ${key} (${size} bytes) FAILED:`, err);
    // Fallo silencioso es la causa raíz del bug de persistencia → hacerlo ruidoso
    try {
      const msg = `⚠️ Error guardando datos en IndexedDB (${size} bytes): ${err instanceof Error ? err.message : String(err)}`;
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('boxshell:idb-error', { detail: msg }));
    } catch { /* ignore */ }
    throw err;
  }
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
    const tx  = db.transaction(PHOTOS_STORE, 'readwrite', { durability: 'strict' });
    const req = tx.objectStore(PHOTOS_STORE).put(photos, itemId);
    req.onsuccess = () => {};
    req.onerror   = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Guarda las fotos de múltiples items en una sola transacción (eficiente para importación) */
export async function saveAllPhotos(photosMap: Record<string, string[]>): Promise<void> {
  const entries = Object.entries(photosMap).filter(([, p]) => p.length > 0);
  if (entries.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(PHOTOS_STORE, 'readwrite', { durability: 'strict' });
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
          const lsSize = new Blob([lsValue]).size;
          console.warn(`[IDB] Migrando ${lsSize} bytes de localStorage → IDB para key '${name}'`);
          await idbSet(name, lsValue);
          localStorage.removeItem(name);
          value = lsValue;
          console.info('[BoxSell] Datos migrados de localStorage → IndexedDB ✓');
        }
      } catch (err) {
        console.error('[IDB] Fallo en migración localStorage→IDB:', err);
      }
    }
    return value;
  },
  setItem: idbSet,
  removeItem: idbDel,
};

/** Diagnóstico: estado de IDB + SW + cuota. Expuesto en window.__boxshellDiag. */
export async function boxshellDiag(): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  // 1. Valor de 'boxsell-storage' en IDB
  try {
    const raw = await idbGet('boxsell-storage');
    if (raw) {
      const size = new Blob([raw]).size;
      const parsed = JSON.parse(raw) as { state?: { boxes?: unknown[]; items?: unknown[] } };
      result.idbState = {
        sizeBytes: size,
        boxes: parsed.state?.boxes?.length ?? 'n/a',
        items: parsed.state?.items?.length ?? 'n/a',
      };
    } else {
      result.idbState = 'VACÍO (null) — éste es el bug si esperabas datos';
    }
  } catch (err) { result.idbState = `ERROR: ${String(err)}`; }
  // 2. Fotos en IDB
  try {
    const photos = await loadAllPhotos();
    const counts = Object.fromEntries(
      Object.entries(photos).slice(0, 5).map(([k, v]) => [k.slice(0, 8), v.length])
    );
    result.idbPhotos = { itemsWithPhotos: Object.keys(photos).length, sample: counts };
  } catch (err) { result.idbPhotos = `ERROR: ${String(err)}`; }
  // 3. localStorage (por si quedó algo de la versión anterior)
  try {
    const ls = localStorage.getItem('boxsell-storage');
    result.localStorage = ls ? `${new Blob([ls]).size} bytes (sobrante, debería migrarse)` : 'vacío ✓';
  } catch { result.localStorage = 'no disponible'; }
  // 4. Cuota del navegador
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) {
      result.storageQuota = {
        usadoMB: ((est.usage ?? 0) / 1024 / 1024).toFixed(2),
        cuotaMB: ((est.quota ?? 0) / 1024 / 1024).toFixed(0),
        porcentaje: est.quota ? `${(((est.usage ?? 0) / est.quota) * 100).toFixed(1)}%` : 'n/a',
      };
    }
  } catch { /* ignore */ }
  // 5. Service Workers
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    result.serviceWorkers = regs?.map((r) => ({
      scope: r.scope,
      active: r.active?.scriptURL,
      waiting: r.waiting?.scriptURL ?? null,
    }));
  } catch { /* ignore */ }
  return result;
}

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

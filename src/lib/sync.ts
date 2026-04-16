/**
 * sync.ts — Sincronización bidireccional con Supabase
 *
 * Tabla requerida en Supabase (ver supabase-schema.sql):
 *   sync_data (user_key text PK, boxes jsonb, items jsonb, updated_at timestamptz)
 *
 * El campo `user_key` actúa como identificador de usuario y contraseña de acceso.
 * Sin RLS, cualquiera con el userKey puede leer/escribir esos datos — úsalo solo
 * con proyectos Supabase privados o habilita RLS.
 */

import { getSupabaseClient } from './supabase';
import type { Box, Item } from '../types';

interface RemotePayload {
  user_key: string;
  boxes: Box[];
  items: Item[];
  updated_at: string;
}

export type SyncResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string };

// ─── Helpers base64 ↔ Blob ────────────────────────────────────────────────────

function base64ToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const [header, data] = dataUrl.split(',');
  const contentType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return { blob: new Blob([arr], { type: contentType }), contentType };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const PHOTOS_BUCKET = 'photos';
const BATCH_SIZE = 5;

// ─── Sync de fotos vía Supabase Storage ───────────────────────────────────────

/** Sube todas las fotos al bucket de Storage (upsert, en batches de 5) */
export async function pushPhotosToStorage(
  supabaseUrl: string,
  anonKey: string,
  userKey: string,
  photosMap: Record<string, string[]>,
  onProgress?: (done: number, total: number) => void,
): Promise<SyncResult> {
  try {
    const client = getSupabaseClient(supabaseUrl, anonKey);
    const normalizedKey = userKey.trim().toLowerCase();

    const tasks: Array<{ itemId: string; index: number; dataUrl: string }> = [];
    for (const [itemId, photos] of Object.entries(photosMap)) {
      for (let i = 0; i < photos.length; i++) {
        if (photos[i]) tasks.push({ itemId, index: i, dataUrl: photos[i] });
      }
    }

    if (tasks.length === 0) return { ok: true, updatedAt: new Date().toISOString() };

    let done = 0;
    onProgress?.(0, tasks.length);

    for (let b = 0; b < tasks.length; b += BATCH_SIZE) {
      const batch = tasks.slice(b, b + BATCH_SIZE);
      await Promise.all(batch.map(async ({ itemId, index, dataUrl }) => {
        const { blob, contentType } = base64ToBlob(dataUrl);
        const path = `${normalizedKey}/${itemId}/${index}`;
        const { error } = await client.storage
          .from(PHOTOS_BUCKET)
          .upload(path, blob, { upsert: true, contentType });
        if (error) console.warn(`[BoxSell] Error subiendo foto ${path}:`, error.message);
        onProgress?.(++done, tasks.length);
      }));
    }

    return { ok: true, updatedAt: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Descarga las fotos de Storage para los items que no tienen fotos locales */
export async function pullPhotosFromStorage(
  supabaseUrl: string,
  anonKey: string,
  userKey: string,
  itemIds: string[],
  existingPhotosMap: Record<string, string[]>,
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, string[]>> {
  try {
    const client = getSupabaseClient(supabaseUrl, anonKey);
    const normalizedKey = userKey.trim().toLowerCase();

    // Solo descargar items sin fotos locales
    const itemsToFetch = itemIds.filter(id => !existingPhotosMap[id]?.length);
    if (itemsToFetch.length === 0) return {};

    // Listar ficheros disponibles en Storage para esos items
    const listings = await Promise.all(
      itemsToFetch.map(async (itemId) => {
        const { data } = await client.storage
          .from(PHOTOS_BUCKET)
          .list(`${normalizedKey}/${itemId}`);
        return { itemId, files: data ?? [] };
      })
    );

    const tasks: Array<{ itemId: string; path: string; index: number }> = [];
    for (const { itemId, files } of listings) {
      for (const file of files) {
        const index = parseInt(file.name);
        if (!isNaN(index)) {
          tasks.push({ itemId, path: `${normalizedKey}/${itemId}/${file.name}`, index });
        }
      }
    }

    if (tasks.length === 0) return {};

    const result: Record<string, string[]> = {};
    let done = 0;
    onProgress?.(0, tasks.length);

    for (let b = 0; b < tasks.length; b += BATCH_SIZE) {
      const batch = tasks.slice(b, b + BATCH_SIZE);
      await Promise.all(batch.map(async ({ itemId, path, index }) => {
        const { data, error } = await client.storage.from(PHOTOS_BUCKET).download(path);
        if (error || !data) {
          console.warn(`[BoxSell] Error descargando foto ${path}:`, error?.message);
          return;
        }
        const base64 = await blobToBase64(data);
        if (!result[itemId]) result[itemId] = [];
        result[itemId][index] = base64;
        onProgress?.(++done, tasks.length);
      }));
    }

    return result;
  } catch (e) {
    console.error('[BoxSell] Error en pullPhotosFromStorage:', e);
    return {};
  }
}

/** Sube los datos locales a Supabase (local gana) */
export async function pushToSupabase(
  supabaseUrl: string,
  anonKey: string,
  userKey: string,
  boxes: Box[],
  items: Item[],
): Promise<SyncResult> {
  try {
    const client = getSupabaseClient(supabaseUrl, anonKey);
    const now = new Date().toISOString();
    const normalizedKey = userKey.trim().toLowerCase();
    const { error } = await client
      .from('sync_data')
      .upsert({ user_key: normalizedKey, boxes, items, updated_at: now });
    if (error) return { ok: false, error: error.message };
    return { ok: true, updatedAt: now };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Descarga los datos de Supabase (remoto gana) */
export async function pullFromSupabase(
  supabaseUrl: string,
  anonKey: string,
  userKey: string,
): Promise<{ ok: true; payload: RemotePayload } | { ok: false; error: string }> {
  try {
    const client = getSupabaseClient(supabaseUrl, anonKey);
    const normalizedKey = userKey.trim().toLowerCase();
    const { data, error } = await client
      .from('sync_data')
      .select('user_key, boxes, items, updated_at')
      .eq('user_key', normalizedKey)
      .maybeSingle();  // no lanza error si no hay fila aún

    if (error) return { ok: false, error: error.message };
    if (!data)  return { ok: false, error: 'No hay datos en la nube con ese código de sync.' };

    return { ok: true, payload: data as RemotePayload };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

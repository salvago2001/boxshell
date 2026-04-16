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

// ─── Sync de fotos vía Supabase Storage (bucket público) ─────────────────────

const PHOTOS_BUCKET = 'photos';
const BATCH_SIZE = 8;

function base64ToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const [header, data] = dataUrl.split(',');
  const contentType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return { blob: new Blob([arr], { type: contentType }), contentType };
}

/** Indica si una string es ya una URL de Storage (no base64) */
export function isStorageUrl(photo: string): boolean {
  return photo.startsWith('http');
}

/**
 * Sube las fotos base64 a Supabase Storage y devuelve un mapa
 * { itemId → string[] } donde cada string es una URL pública de Storage.
 * Las fotos que ya son URLs de Storage se omiten (ya están subidas).
 */
export async function pushPhotosToStorage(
  supabaseUrl: string,
  anonKey: string,
  userKey: string,
  photosMap: Record<string, string[]>,
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: true; urlMap: Record<string, string[]> } | { ok: false; error: string }> {
  try {
    const client = getSupabaseClient(supabaseUrl, anonKey);
    const normalizedKey = userKey.trim().toLowerCase();
    const publicBase = `${supabaseUrl}/storage/v1/object/public/${PHOTOS_BUCKET}`;

    // Preparar tareas: solo fotos base64 (las URLs ya están subidas)
    const tasks: Array<{ itemId: string; index: number; dataUrl: string }> = [];
    for (const [itemId, photos] of Object.entries(photosMap)) {
      for (let i = 0; i < photos.length; i++) {
        if (photos[i] && !isStorageUrl(photos[i])) {
          tasks.push({ itemId, index: i, dataUrl: photos[i] });
        }
      }
    }

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

    // Construir el mapa de URLs públicas para TODOS los items del photosMap
    const urlMap: Record<string, string[]> = {};
    for (const [itemId, photos] of Object.entries(photosMap)) {
      urlMap[itemId] = photos.map((photo, index) => {
        if (!photo) return '';
        if (isStorageUrl(photo)) return photo; // ya era URL
        return `${publicBase}/${normalizedKey}/${itemId}/${index}`;
      }).filter(Boolean);
    }

    return { ok: true, urlMap };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
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

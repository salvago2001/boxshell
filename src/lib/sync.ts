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
    const { error } = await client
      .from('sync_data')
      .upsert({ user_key: userKey, boxes, items, updated_at: now });
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
    const { data, error } = await client
      .from('sync_data')
      .select('user_key, boxes, items, updated_at')
      .eq('user_key', userKey)
      .maybeSingle();  // no lanza error si no hay fila aún

    if (error) return { ok: false, error: error.message };
    if (!data)  return { ok: false, error: 'No hay datos en la nube con ese código de sync.' };

    return { ok: true, payload: data as RemotePayload };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

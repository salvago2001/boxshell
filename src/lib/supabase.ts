import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cache del cliente para no recrearlo si la config no cambia
let _cachedUrl = '';
let _cachedKey = '';
let _client: SupabaseClient | null = null;

export function getSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (_client && _cachedUrl === url && _cachedKey === anonKey) return _client;
  _client    = createClient(url, anonKey);
  _cachedUrl = url;
  _cachedKey = anonKey;
  return _client;
}

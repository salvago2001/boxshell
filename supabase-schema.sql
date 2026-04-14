-- BoxSell — Schema Supabase
-- Ejecuta este SQL en: Supabase Dashboard → SQL Editor → New query

-- Tabla de sincronización
-- user_key actúa como identificador de usuario (es tu "código de sync" personal).
-- Sin RLS activo: cualquiera con el user_key puede leer/modificar esos datos,
-- por eso elige una clave difícil de adivinar. Puedes habilitar RLS si prefieres
-- usar autenticación de Supabase en lugar de la clave compartida.

create table if not exists sync_data (
  user_key   text        primary key,
  boxes      jsonb       not null default '[]'::jsonb,
  items      jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Índice para acelerar la consulta por user_key (ya es PK, así que es implícito,
-- pero lo dejamos explícito para recordarlo)
-- create index if not exists sync_data_user_key_idx on sync_data (user_key);

-- OPCIONAL — habilitar RLS si quieres más seguridad:
-- alter table sync_data enable row level security;
-- create policy "own" on sync_data
--   using (user_key = current_setting('request.headers', true)::jsonb->>'x-user-key');

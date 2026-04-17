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

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE — bucket `photos`
-- ─────────────────────────────────────────────────────────────────────────────
-- PROBLEMA sin esto: cuando pulses "Subir a la nube", TODAS las fotos fallarán
-- con `new row violates row-level security policy` (HTTP 400) y no se subirán
-- al Storage. El anon key necesita política explícita de INSERT/UPDATE/SELECT.
--
-- Ejecuta este bloque en: Supabase Dashboard → SQL Editor → New query.
-- Después de ejecutarlo, el "Subir a la nube" sincronizará las fotos sin error.

-- 1. Crear el bucket público si no existe
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- 2. Políticas RLS en storage.objects para el bucket `photos`
--    (la tabla storage.objects ya tiene RLS habilitada por defecto)

-- Lectura pública (necesario para que las URLs públicas funcionen)
drop policy if exists "boxshell_photos_read" on storage.objects;
create policy "boxshell_photos_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'photos');

-- INSERT libre desde anon (el user_key va en el path → no hace falta auth real)
drop policy if exists "boxshell_photos_insert" on storage.objects;
create policy "boxshell_photos_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'photos');

-- UPDATE libre desde anon (necesario para upsert: true en el cliente)
drop policy if exists "boxshell_photos_update" on storage.objects;
create policy "boxshell_photos_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'photos')
  with check (bucket_id = 'photos');

-- DELETE libre (opcional — habilita si quieres que la app borre fotos remotas)
drop policy if exists "boxshell_photos_delete" on storage.objects;
create policy "boxshell_photos_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'photos');

-- NOTA DE SEGURIDAD: estas políticas permiten a cualquiera con el anon key
-- leer/escribir en el bucket `photos`. Como el user_key es parte del path
-- y es secreto, sólo quien lo conozca puede modificar las fotos de ese user.
-- Si quieres blindarlo más, usa un prefijo aleatorio por usuario o activa
-- Supabase Auth y migra a policies basadas en `auth.uid()`.

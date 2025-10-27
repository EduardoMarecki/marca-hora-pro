-- Ensure selfies bucket exists and is private; remove public read policy
-- Safer storage: bucket privado + URLs assinadas

-- Create bucket if missing, force public=false
insert into storage.buckets (id, name, public)
values ('selfies', 'selfies', false)
on conflict (id) do update set public = excluded.public;

-- Drop permissive public read policy if it exists
drop policy if exists "Public read access to selfies" on storage.objects;

-- Keep other policies (inserir/selecionar/excluir pelo próprio usuário)
-- As políticas foram criadas na migration 20251027030000_create_selfies_storage.sql
-- e continuam válidas para permitir createSignedUrl apenas pelo dono.
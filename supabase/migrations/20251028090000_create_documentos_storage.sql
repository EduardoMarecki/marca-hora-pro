-- Create documentos storage bucket and secure policies
-- This migration sets up a private bucket for collaborator documents

-- Ensure the 'documentos' bucket exists and is private
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do update set public = excluded.public;

-- Helpful note: storage.foldername(name) returns text[] with path segments
-- We store files as: documentos/{profile_id}/{timestamp_filename}

-- Drop policy if exists to avoid duplicate_object errors, then create
drop policy if exists "Users or admins can upload documentos" on storage.objects;
create policy "Users or admins can upload documentos"
on storage.objects
for insert
with check (
  bucket_id = 'documentos' and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role(auth.uid(), 'admin')
  )
);

-- Users can view only their own documents
drop policy if exists "Users can view own documentos" on storage.objects;
create policy "Users can view own documentos"
on storage.objects
for select
using (
  bucket_id = 'documentos' and auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all documents
drop policy if exists "Admins can view all documentos" on storage.objects;
create policy "Admins can view all documentos"
on storage.objects
for select
using (
  bucket_id = 'documentos' and public.has_role(auth.uid(), 'admin')
);

-- Allow users to delete only their own documents, and admins can delete any
drop policy if exists "Users or admins can delete documentos" on storage.objects;
create policy "Users or admins can delete documentos"
on storage.objects
for delete
using (
  bucket_id = 'documentos' and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role(auth.uid(), 'admin')
  )
);
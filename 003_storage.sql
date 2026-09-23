-- ============================================================
-- KAYA LEO — 003_storage.sql
-- Storage buckets: avatars + property-images.
-- Public read; authenticated users may only write inside
-- their own user folder (avatars/{uid}/..., property-images/{uid}/...).
-- The mobile app uploads directly with the user's JWT;
-- the service-role key NEVER ships in the app.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

-- avatars: read public
create policy "avatars: public read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: upload own folder" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: update own folder" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: delete own folder" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- property-images: read public
create policy "property-images: public read" on storage.objects for select
  using (bucket_id = 'property-images');

create policy "property-images: upload own folder" on storage.objects for insert
  with check (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "property-images: update own folder" on storage.objects for update
  using (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "property-images: delete own folder" on storage.objects for delete
  using (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);

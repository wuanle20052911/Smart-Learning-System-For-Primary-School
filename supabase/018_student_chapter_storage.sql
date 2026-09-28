drop policy if exists "Authenticated users read chapter documents" on storage.objects;
create policy "Authenticated users read chapter documents"
  on storage.objects for select to authenticated
  using (bucket_id in ('Chapter1', 'Chapter2', 'Chapter3'));
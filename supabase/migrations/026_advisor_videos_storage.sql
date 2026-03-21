-- 026_advisor_videos_storage.sql
-- Zweck:
-- - Storage-Bucket fuer Berater-Begruessungsvideos
-- - RLS-Policies: Berater duerfen nur im eigenen Advisor-Ordner hochladen/aendern/loeschen

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advisor-videos',
  'advisor-videos',
  true,
  52428800,
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v',
    'video/ogg'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'advisor_videos_public_read'
  ) then
    create policy advisor_videos_public_read
      on storage.objects
      for select
      using (bucket_id = 'advisor-videos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'advisor_videos_insert_advisor_member'
  ) then
    create policy advisor_videos_insert_advisor_member
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'advisor-videos'
        and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        and public.is_advisor_member((split_part(name, '/', 1))::uuid)
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'advisor_videos_update_advisor_member'
  ) then
    create policy advisor_videos_update_advisor_member
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'advisor-videos'
        and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        and public.is_advisor_member((split_part(name, '/', 1))::uuid)
      )
      with check (
        bucket_id = 'advisor-videos'
        and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        and public.is_advisor_member((split_part(name, '/', 1))::uuid)
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'advisor_videos_delete_advisor_member'
  ) then
    create policy advisor_videos_delete_advisor_member
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'advisor-videos'
        and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        and public.is_advisor_member((split_part(name, '/', 1))::uuid)
      );
  end if;
end
$$;


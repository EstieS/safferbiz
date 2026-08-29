-- SafferBiz: owner-uploaded listing logos
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- The `logo_url` column already exists on `listings` (see schema.sql). This just
-- provisions the Storage bucket the manage form uploads into.

-- Public bucket. Reads are public (served via the CDN); every write and delete
-- goes through the service-role admin client in /api/manage/[slug]/logo, which
-- bypasses Storage RLS. The anon key can therefore never write here.
--
-- 512 KB hard ceiling — the browser resizes each logo to ~400px WebP before
-- upload (usually 15-40 KB), so this is only a backstop against abuse.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-logos',
  'listing-logos',
  true,
  524288,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects RLS policies are needed: the bucket is public for reads and
-- only the service role writes to it.

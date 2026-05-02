-- SafferBiz database schema
-- Run this in your Supabase SQL editor

create table if not exists listings (
  id          uuid default gen_random_uuid() primary key,
  business_name text not null,
  slug        text unique not null,
  description text,
  category    text not null,
  country     text not null,
  city        text,
  website_url text,
  facebook_url text,
  instagram_url text,
  logo_url    text,
  email       text,
  status      text not null default 'pending'
                check (status in ('active', 'pending', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast lookups
create index if not exists listings_slug_idx       on listings (slug);
create index if not exists listings_status_idx     on listings (status);
create index if not exists listings_category_idx   on listings (category);
create index if not exists listings_country_idx    on listings (country);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger set_updated_at
  before update on listings
  for each row execute procedure update_updated_at();

-- Row Level Security
alter table listings enable row level security;

-- Public: can only read active listings
create policy "Public read active listings"
  on listings for select
  using (status = 'active');

-- Service role bypasses RLS automatically (used by admin client)

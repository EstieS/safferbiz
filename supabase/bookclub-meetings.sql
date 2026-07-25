-- Book club meetings (run after bookclub.sql)
-- Run this in your Supabase SQL editor

-- A purchase/preview link (Amazon, Goodreads, etc.) for each book
alter table books add column if not exists purchase_link text;

create table if not exists club_meetings (
  id          uuid default gen_random_uuid() primary key,
  club_id     uuid not null references clubs(id) on delete cascade,
  book_id     uuid references books(id) on delete set null,
  meeting_at  timestamptz not null,
  zoom_link   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists club_meetings_club_idx on club_meetings (club_id, meeting_at);

create or replace trigger set_updated_at_meetings
  before update on club_meetings
  for each row execute procedure update_updated_at();

alter table club_meetings enable row level security;

-- Any club member can view, add, edit, or remove meetings for their own club
create policy "Members can read club meetings"
  on club_meetings for select
  using (is_club_member(club_id));

create policy "Members can add club meetings"
  on club_meetings for insert
  with check (is_club_member(club_id));

create policy "Members can edit club meetings"
  on club_meetings for update
  using (is_club_member(club_id));

create policy "Members can delete club meetings"
  on club_meetings for delete
  using (is_club_member(club_id));

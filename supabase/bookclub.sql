-- Book club feature (multi-club ready)
-- Run this in your Supabase SQL editor

create table if not exists clubs (
  id          uuid default gen_random_uuid() primary key,
  slug        text unique not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists club_members (
  id           uuid default gen_random_uuid() primary key,
  club_id      uuid not null references clubs(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  unique (club_id, user_id)
);

create table if not exists books (
  id          uuid default gen_random_uuid() primary key,
  club_id     uuid not null references clubs(id) on delete cascade,
  title       text not null,
  author      text,
  month_label text not null, -- e.g. "July 2026"
  picked_by   text,
  notes       text,
  added_by    uuid references club_members(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists book_scores (
  id             uuid default gen_random_uuid() primary key,
  book_id        uuid not null references books(id) on delete cascade,
  club_member_id uuid not null references club_members(id) on delete cascade,
  score          numeric(3,1) not null check (score >= 0 and score <= 10),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (book_id, club_member_id)
);

create index if not exists club_members_user_idx on club_members (user_id);
create index if not exists books_club_idx on books (club_id);
create index if not exists book_scores_book_idx on book_scores (book_id);

create or replace trigger set_updated_at_books
  before update on books
  for each row execute procedure update_updated_at();

create or replace trigger set_updated_at_scores
  before update on book_scores
  for each row execute procedure update_updated_at();

-- Helper: is the current auth user a member of this club?
create or replace function is_club_member(target_club_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from club_members
    where club_id = target_club_id and user_id = auth.uid()
  );
$$;

-- Row Level Security
alter table clubs enable row level security;
alter table club_members enable row level security;
alter table books enable row level security;
alter table book_scores enable row level security;

-- clubs: members can read their own club's public info
create policy "Members can read their club"
  on clubs for select
  using (is_club_member(id));

-- club_members: members can see the roster of clubs they belong to
create policy "Members can read club roster"
  on club_members for select
  using (is_club_member(club_id));

-- books: members can read/add/edit books within their own club
create policy "Members can read club books"
  on books for select
  using (is_club_member(club_id));

create policy "Members can add club books"
  on books for insert
  with check (is_club_member(club_id));

create policy "Members can edit club books"
  on books for update
  using (is_club_member(club_id));

-- book_scores: members can read all scores for books in their club,
-- but can only write their own score
create policy "Members can read club scores"
  on book_scores for select
  using (
    exists (
      select 1 from books
      where books.id = book_scores.book_id and is_club_member(books.club_id)
    )
  );

create policy "Members can insert their own score"
  on book_scores for insert
  with check (
    exists (
      select 1 from club_members
      where club_members.id = book_scores.club_member_id
        and club_members.user_id = auth.uid()
    )
  );

create policy "Members can update their own score"
  on book_scores for update
  using (
    exists (
      select 1 from club_members
      where club_members.id = book_scores.club_member_id
        and club_members.user_id = auth.uid()
    )
  );

-- Seed: Bubbles and Books
insert into clubs (slug, name)
values ('bubbles-and-books', 'Bubbles and Books')
on conflict (slug) do nothing;

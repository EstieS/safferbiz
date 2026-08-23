-- Book club admin: score editing on behalf of members + managed quotes
-- Run this in your Supabase SQL editor (after bookclub.sql, bookclub-comments.sql)

alter table club_members add column if not exists is_admin boolean not null default false;

-- Helper: is the current auth user an admin of this club?
create or replace function is_club_admin(target_club_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from club_members
    where club_id = target_club_id and user_id = auth.uid() and is_admin = true
  );
$$;

-- Make Estie an admin of Bubbles and Books
update club_members
set is_admin = true
where club_id = (select id from clubs where slug = 'bubbles-and-books')
  and user_id = (select id from auth.users where lower(email) = lower('estiesa@gmail.com'));

-- book_scores: admins can write any member's score in their own club
-- (these are additional permissive policies -- they OR with the existing
-- "own score only" policies from bookclub.sql, they don't replace them)
create policy "Admins can insert any score in their club"
  on book_scores for insert
  with check (
    exists (
      select 1 from club_members target
      where target.id = book_scores.club_member_id
        and is_club_admin(target.club_id)
    )
  );

create policy "Admins can update any score in their club"
  on book_scores for update
  using (
    exists (
      select 1 from club_members target
      where target.id = book_scores.club_member_id
        and is_club_admin(target.club_id)
    )
  );

-- book_comments: admins can write any member's comment in their own club
create policy "Admins can insert any comment in their club"
  on book_comments for insert
  with check (
    exists (
      select 1 from club_members target
      where target.id = book_comments.club_member_id
        and is_club_admin(target.club_id)
    )
  );

create policy "Admins can update any comment in their club"
  on book_comments for update
  using (
    exists (
      select 1 from club_members target
      where target.id = book_comments.club_member_id
        and is_club_admin(target.club_id)
    )
  );

create policy "Admins can delete any comment in their club"
  on book_comments for delete
  using (
    exists (
      select 1 from club_members target
      where target.id = book_comments.club_member_id
        and is_club_admin(target.club_id)
    )
  );

-- club_quotes: the "welcome quote" library, editable by admins
create table if not exists club_quotes (
  id         uuid default gen_random_uuid() primary key,
  club_id    uuid not null references clubs(id) on delete cascade,
  quote      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_quotes_club_idx on club_quotes (club_id);

create or replace trigger set_updated_at_quotes
  before update on club_quotes
  for each row execute procedure update_updated_at();

alter table club_quotes enable row level security;

create policy "Members can read club quotes"
  on club_quotes for select
  using (is_club_member(club_id));

create policy "Admins can add club quotes"
  on club_quotes for insert
  with check (is_club_admin(club_id));

create policy "Admins can edit club quotes"
  on club_quotes for update
  using (is_club_admin(club_id));

create policy "Admins can delete club quotes"
  on club_quotes for delete
  using (is_club_admin(club_id));

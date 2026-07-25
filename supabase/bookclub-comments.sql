-- Book club comments (run after bookclub.sql)
-- Run this in your Supabase SQL editor

create table if not exists book_comments (
  id             uuid default gen_random_uuid() primary key,
  book_id        uuid not null references books(id) on delete cascade,
  club_member_id uuid not null references club_members(id) on delete cascade,
  comment        text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (book_id, club_member_id)
);

create index if not exists book_comments_book_idx on book_comments (book_id);

create or replace trigger set_updated_at_comments
  before update on book_comments
  for each row execute procedure update_updated_at();

alter table book_comments enable row level security;

create policy "Members can read club comments"
  on book_comments for select
  using (
    exists (
      select 1 from books
      where books.id = book_comments.book_id and is_club_member(books.club_id)
    )
  );

create policy "Members can insert their own comment"
  on book_comments for insert
  with check (
    exists (
      select 1 from club_members
      where club_members.id = book_comments.club_member_id
        and club_members.user_id = auth.uid()
    )
  );

create policy "Members can update their own comment"
  on book_comments for update
  using (
    exists (
      select 1 from club_members
      where club_members.id = book_comments.club_member_id
        and club_members.user_id = auth.uid()
    )
  );

create policy "Members can delete their own comment"
  on book_comments for delete
  using (
    exists (
      select 1 from club_members
      where club_members.id = book_comments.club_member_id
        and club_members.user_id = auth.uid()
    )
  );

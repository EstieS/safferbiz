-- Lets a club admin manually pin which book is "current" in the Next
-- Meeting card, instead of it always being auto-detected from today's
-- month vs. each book's month_label. Run this in your Supabase SQL editor
-- (after bookclub-admin.sql).

alter table clubs add column if not exists current_book_id uuid references books(id) on delete set null;

create policy "Admins can update their club"
  on clubs for update
  using (is_club_admin(id));

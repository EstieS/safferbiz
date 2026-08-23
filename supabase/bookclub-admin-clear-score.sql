-- Lets a club admin clear (delete) a member's score, e.g. after entering
-- one on the wrong book by mistake. Run this in your Supabase SQL editor
-- (after bookclub-admin.sql).

create policy "Admins can delete any score in their club"
  on book_scores for delete
  using (
    exists (
      select 1 from club_members target
      where target.id = book_scores.club_member_id
        and is_club_admin(target.club_id)
    )
  );

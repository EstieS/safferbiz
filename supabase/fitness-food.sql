-- Fitness tracker: food habits (one shared tick-list per group, scored separately from fitness)
-- Run this in your Supabase SQL editor after fitness.sql.
-- Paste the WHOLE file with nothing highlighted, then Run.

create table if not exists public.fit_habits (
  id          uuid default gen_random_uuid() primary key,
  group_id    uuid not null references public.fit_groups(id) on delete cascade,
  name        text not null,
  emoji       text not null default '✅',
  points      int  not null default 3 check (points > 0 and points <= 50),
  active      boolean not null default true, -- retire habits instead of deleting, so old weeks keep their points
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per ticked habit per day; unticking deletes the row.
-- Points are snapshotted so editing a habit later never rewrites past weeks.
create table if not exists public.fit_habit_logs (
  id          uuid default gen_random_uuid() primary key,
  member_id   uuid not null references public.fit_members(id) on delete cascade,
  habit_id    uuid not null references public.fit_habits(id) on delete cascade,
  day         date not null,
  points      int  not null check (points > 0),
  created_at  timestamptz not null default now(),
  unique (member_id, habit_id, day)
);

create index if not exists fit_habits_group_idx on public.fit_habits (group_id);
create index if not exists fit_habit_logs_member_day_idx on public.fit_habit_logs (member_id, day);

create or replace trigger set_updated_at_fit_habits
  before update on public.fit_habits
  for each row execute procedure public.update_updated_at();

alter table public.fit_habits enable row level security;
alter table public.fit_habit_logs enable row level security;

drop policy if exists "Members read habits" on public.fit_habits;
create policy "Members read habits"
  on public.fit_habits for select using (public.is_fit_member(group_id));

drop policy if exists "Members add habits" on public.fit_habits;
create policy "Members add habits"
  on public.fit_habits for insert with check (public.is_fit_member(group_id));

drop policy if exists "Members edit habits" on public.fit_habits;
create policy "Members edit habits"
  on public.fit_habits for update using (public.is_fit_member(group_id)) with check (public.is_fit_member(group_id));

drop policy if exists "Members read habit logs" on public.fit_habit_logs;
create policy "Members read habit logs"
  on public.fit_habit_logs for select using (public.is_fit_member(public.fit_member_group(member_id)));

drop policy if exists "Members tick own habits" on public.fit_habit_logs;
create policy "Members tick own habits"
  on public.fit_habit_logs for insert with check (public.is_my_fit_member(member_id));

drop policy if exists "Members untick own habits" on public.fit_habit_logs;
create policy "Members untick own habits"
  on public.fit_habit_logs for delete using (public.is_my_fit_member(member_id));

-- Starter list (only if the group has no habits yet)
insert into public.fit_habits (group_id, name, emoji, points, sort_order)
select g.id, h.name, h.emoji, h.points, h.sort_order
from public.fit_groups g
cross join (values
  ('Drank 8 glasses of water', '💧', 5, 1),
  ('Hit my protein goal', '🥩', 5, 2),
  ('5 servings of veg/fruit', '🥦', 5, 3),
  ('Veg with lunch and dinner', '🥗', 3, 4),
  ('No sugary drinks', '🚫', 3, 5),
  ('Alcohol-free day', '🍷', 3, 6),
  ('Kitchen closed after dinner', '🌙', 3, 7),
  ('Ate a home-cooked meal', '🍳', 2, 8)
) as h(name, emoji, points, sort_order)
where g.slug = 'sweat-sisters'
  and not exists (select 1 from public.fit_habits where group_id = g.id);

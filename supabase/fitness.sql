-- Fitness tracker (private, login-only; multi-group ready like the book club)
-- Run this in your Supabase SQL editor, then: node scripts/seed-fitness.mjs

create table if not exists fit_groups (
  id          uuid default gen_random_uuid() primary key,
  slug        text unique not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists fit_members (
  id           uuid default gen_random_uuid() primary key,
  group_id     uuid not null references fit_groups(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  equipment    text not null default 'dumbbells' check (equipment in ('dumbbells', 'none')),
  created_at   timestamptz not null default now(),
  unique (group_id, user_id)
);

-- One row = one specific version of a routine (e.g. "Upper Body Burner", 10 min, dumbbells).
-- Versions of the same routine share a `family` so the library can group them.
create table if not exists fit_routines (
  id          uuid default gen_random_uuid() primary key,
  group_id    uuid not null references fit_groups(id) on delete cascade,
  family      text not null,
  name        text not null,
  category    text not null check (category in ('upper', 'lower', 'core', 'full', 'cardio')),
  minutes     int  not null check (minutes > 0 and minutes <= 120),
  intensity   text not null check (intensity in ('easy', 'medium', 'hard')),
  equipment   text not null check (equipment in ('dumbbells', 'none')),
  rounds      int  not null default 1 check (rounds > 0),
  moves       jsonb not null default '[]'::jsonb, -- [{ "name": "Squats", "amount": "12 reps" }]
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Weekly points goal per member. week_start is always a Monday.
create table if not exists fit_goals (
  id          uuid default gen_random_uuid() primary key,
  member_id   uuid not null references fit_members(id) on delete cascade,
  week_start  date not null,
  goal        int  not null check (goal > 0 and goal <= 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (member_id, week_start)
);

-- A planned or logged workout. Routine details are snapshotted so editing the
-- library later never rewrites past weeks' points.
create table if not exists fit_entries (
  id            uuid default gen_random_uuid() primary key,
  member_id     uuid not null references fit_members(id) on delete cascade,
  routine_id    uuid references fit_routines(id) on delete set null,
  day           date not null,
  title         text not null,
  category      text not null check (category in ('upper', 'lower', 'core', 'full', 'cardio')),
  minutes       int  not null check (minutes > 0 and minutes <= 300),
  intensity     text not null check (intensity in ('easy', 'medium', 'hard')),
  planned       boolean not null default true,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists fit_members_user_idx on fit_members (user_id);
create index if not exists fit_routines_group_idx on fit_routines (group_id);
create index if not exists fit_entries_member_day_idx on fit_entries (member_id, day);
create index if not exists fit_goals_member_idx on fit_goals (member_id);

create or replace trigger set_updated_at_fit_routines
  before update on fit_routines
  for each row execute procedure update_updated_at();

create or replace trigger set_updated_at_fit_goals
  before update on fit_goals
  for each row execute procedure update_updated_at();

create or replace trigger set_updated_at_fit_entries
  before update on fit_entries
  for each row execute procedure update_updated_at();

-- Helpers
create or replace function is_fit_member(target_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from fit_members
    where group_id = target_group_id and user_id = auth.uid()
  );
$$;

create or replace function is_my_fit_member(target_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from fit_members
    where id = target_member_id and user_id = auth.uid()
  );
$$;

create or replace function fit_member_group(target_member_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select group_id from fit_members where id = target_member_id;
$$;

-- Row Level Security
alter table fit_groups enable row level security;
alter table fit_members enable row level security;
alter table fit_routines enable row level security;
alter table fit_goals enable row level security;
alter table fit_entries enable row level security;

drop policy if exists "Members read their group" on fit_groups;
create policy "Members read their group"
  on fit_groups for select using (is_fit_member(id));

drop policy if exists "Members read roster" on fit_members;
create policy "Members read roster"
  on fit_members for select using (is_fit_member(group_id));

drop policy if exists "Members update own settings" on fit_members;
create policy "Members update own settings"
  on fit_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Routines: shared library, any member can read/add/edit
drop policy if exists "Members read routines" on fit_routines;
create policy "Members read routines"
  on fit_routines for select using (is_fit_member(group_id));

drop policy if exists "Members add routines" on fit_routines;
create policy "Members add routines"
  on fit_routines for insert with check (is_fit_member(group_id));

drop policy if exists "Members edit routines" on fit_routines;
create policy "Members edit routines"
  on fit_routines for update using (is_fit_member(group_id)) with check (is_fit_member(group_id));

-- Goals and entries: everyone in the group can see, only the owner can write
drop policy if exists "Members read goals" on fit_goals;
create policy "Members read goals"
  on fit_goals for select using (is_fit_member(fit_member_group(member_id)));

drop policy if exists "Members write own goals" on fit_goals;
create policy "Members write own goals"
  on fit_goals for insert with check (is_my_fit_member(member_id));

drop policy if exists "Members update own goals" on fit_goals;
create policy "Members update own goals"
  on fit_goals for update using (is_my_fit_member(member_id)) with check (is_my_fit_member(member_id));

drop policy if exists "Members read entries" on fit_entries;
create policy "Members read entries"
  on fit_entries for select using (is_fit_member(fit_member_group(member_id)));

drop policy if exists "Members add own entries" on fit_entries;
create policy "Members add own entries"
  on fit_entries for insert with check (is_my_fit_member(member_id));

drop policy if exists "Members update own entries" on fit_entries;
create policy "Members update own entries"
  on fit_entries for update using (is_my_fit_member(member_id)) with check (is_my_fit_member(member_id));

drop policy if exists "Members delete own entries" on fit_entries;
create policy "Members delete own entries"
  on fit_entries for delete using (is_my_fit_member(member_id));

-- Seed the group (members + starter library are added by scripts/seed-fitness.mjs)
insert into fit_groups (slug, name)
values ('sweat-sisters', 'Sweat Sisters')
on conflict (slug) do nothing;

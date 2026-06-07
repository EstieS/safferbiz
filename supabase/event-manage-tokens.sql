-- SafferBiz: Organiser self-edit for events
-- Run this once in your Supabase SQL editor. Safe to re-run (idempotent).
--
-- When you approve an event, the organiser gets a private link to manage their
-- own event details. The edit token lives in this locked-down table (never on
-- the publicly-readable events table).

create table if not exists event_manage_tokens (
  event_id    uuid primary key references events (id) on delete cascade,
  token       text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists event_manage_tokens_token_idx on event_manage_tokens (token);

-- RLS with no public policy = only the service-role (admin) client can read/write.
alter table event_manage_tokens enable row level security;

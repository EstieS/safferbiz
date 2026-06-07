-- SafferBiz: Verified badge + Owner claim flow
-- Run this once in your Supabase SQL editor. Safe to re-run (idempotent).
--
-- Phase 1 (badge + admin toggle): is_verified, verified_at, verified_via
-- Phase 2 (owner claim): claimed_by_email + listing_claims + listing_manage_tokens

-- ── Phase 1: verification state ──────────────────────────────────────────────
alter table listings add column if not exists is_verified boolean not null default false;
alter table listings add column if not exists verified_at  timestamptz;
alter table listings add column if not exists verified_via text
  check (verified_via in ('admin', 'owner_claim'));

-- ── Phase 2: who claimed it (set when you approve a claim) ────────────────────
alter table listings add column if not exists claimed_by_email text;

create index if not exists listings_is_verified_idx on listings (is_verified);

-- Pending-claim review queue. Every claim lands here for you to approve/reject.
create table if not exists listing_claims (
  id              uuid default gen_random_uuid() primary key,
  listing_id      uuid not null references listings (id) on delete cascade,
  claimant_name   text not null,
  claimant_email  text not null,
  message         text,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);

create index if not exists listing_claims_status_idx  on listing_claims (status);
create index if not exists listing_claims_listing_idx on listing_claims (listing_id);

-- Owner edit credential. SEPARATE table because the public/anon key can read the
-- `listings` table (status = active) — this token must never be publicly readable.
-- RLS with no public policy means only the service-role (admin) client can touch it.
create table if not exists listing_manage_tokens (
  listing_id  uuid primary key references listings (id) on delete cascade,
  token       text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists listing_manage_tokens_token_idx on listing_manage_tokens (token);

-- RLS: both tables are private (service-role bypasses RLS; no public policy = locked).
alter table listing_claims        enable row level security;
alter table listing_manage_tokens enable row level security;

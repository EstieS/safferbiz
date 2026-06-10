-- SafferBiz: track how each listing was created, to drive approval behaviour
-- Run once in the Supabase SQL editor. Safe to re-run.
--
--   'owner' → submitted via the public Add Listing form (real owner or admin
--             filling it in). On approval: verified + sent a self-manage link.
--   'admin' → bulk-imported curated data (import-listings.mjs). Treated as trusted.
--   'ai'    → auto-discovered by the AI agents. On approval: stays unverified and
--             the owner is auto-sent a claim invite.
--
-- Existing rows default to 'ai' (conservative — they don't become verified
-- automatically; they earn the badge via a claim or your manual Verify toggle).

alter table listings add column if not exists source text not null default 'ai'
  check (source in ('owner', 'admin', 'ai'));

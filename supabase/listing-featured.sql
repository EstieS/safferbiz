-- SafferBiz: track when a business was last featured in a spotlight post,
-- so the weekly Spotlight agent rotates through businesses instead of repeating.
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table listings add column if not exists last_featured_at timestamptz;

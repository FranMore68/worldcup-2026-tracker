-- Migration: add owner column to fixtures
-- Applied on 2026-06-27 after sync-fifa/sync-openligadb started writing owner.

ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS owner TEXT;

-- Backfill existing rows: any row created before this change is treated as
-- owned by OpenLigaDB, since those fixtures came from the original seed/sync.
UPDATE public.fixtures SET owner = 'openligadb' WHERE owner IS NULL;

-- Helpful index for the deduplication logic in sync-fifa.
CREATE INDEX IF NOT EXISTS idx_fixtures_owner ON public.fixtures(owner);

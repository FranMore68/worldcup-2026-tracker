-- Migration: add penalty shootout columns to fixtures
-- Applied after sync-fifa started writing HomeTeamPenaltyScore/AwayTeamPenaltyScore.

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS home_penalty_goals INT,
  ADD COLUMN IF NOT EXISTS away_penalty_goals INT;

-- Helpful index for querying knockout fixtures that went to penalties.
CREATE INDEX IF NOT EXISTS idx_fixtures_penalties
  ON public.fixtures(home_penalty_goals, away_penalty_goals)
  WHERE home_penalty_goals IS NOT NULL;

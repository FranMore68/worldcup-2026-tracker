-- ============================================
-- Mundial Soccer 2026 Tracker - Schema SQL
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.teams (
  id            SERIAL PRIMARY KEY,
  api_id        INT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  code          TEXT,
  country       TEXT,
  founded       INT,
  national      BOOLEAN DEFAULT FALSE,
  logo          TEXT,
  venue_id      INT,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.teams IS 'Stores team data from OpenLigaDB with raw JSONB payload';

CREATE INDEX IF NOT EXISTS idx_teams_api_id ON public.teams(api_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(name);

-- ============================================
-- 2. VENUES
-- ============================================
CREATE TABLE IF NOT EXISTS public.venues (
  id            SERIAL PRIMARY KEY,
  api_id        INT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  country       TEXT,
  capacity      INT,
  surface       TEXT,
  image         TEXT,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.venues IS 'Stadium and venue data (optional)';

CREATE INDEX IF NOT EXISTS idx_venues_api_id ON public.venues(api_id);
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);

-- ============================================
-- 3. FIXTURES
-- ============================================
CREATE TABLE IF NOT EXISTS public.fixtures (
  id            SERIAL PRIMARY KEY,
  api_id        INT UNIQUE NOT NULL,
  match_date_utc TIMESTAMPTZ NOT NULL,
  match_date_local TEXT,
  status_short   TEXT NOT NULL DEFAULT 'TBD',
  status_long    TEXT,
  round          TEXT,
  home_team_id   INT NOT NULL REFERENCES public.teams(api_id),
  away_team_id   INT NOT NULL REFERENCES public.teams(api_id),
  home_goals     INT,
  away_goals     INT,
  home_penalty_goals INT,
  away_penalty_goals INT,
  venue_id       INT REFERENCES public.venues(api_id),
  league_id      INT DEFAULT 1,
  season         INT DEFAULT 2026,
  -- Structural owner of the row: 'openligadb' or 'fifa'. OpenLigaDB owns the
  -- bracket and stable api_id; FIFA is the real-time enrichment layer.
  owner          TEXT DEFAULT 'openligadb',
  raw_payload    JSONB NOT NULL DEFAULT '{}',
  synced_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.fixtures IS 'World Cup 2026 matches with raw API payload';

CREATE INDEX IF NOT EXISTS idx_fixtures_api_id ON public.fixtures(api_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_match_date ON public.fixtures(match_date_utc);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON public.fixtures(status_short);
CREATE INDEX IF NOT EXISTS idx_fixtures_home_team ON public.fixtures(home_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_away_team ON public.fixtures(away_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_round ON public.fixtures(round);

-- ============================================
-- 4. STANDINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.standings (
  id            SERIAL PRIMARY KEY,
  season        INT NOT NULL DEFAULT 2026,
  group_name    TEXT NOT NULL,
  team_id       INT NOT NULL REFERENCES public.teams(api_id),
  rank          INT NOT NULL,
  points        INT DEFAULT 0,
  goals_diff    INT DEFAULT 0,
  played        INT DEFAULT 0,
  won           INT DEFAULT 0,
  draw          INT DEFAULT 0,
  lost          INT DEFAULT 0,
  goals_for     INT DEFAULT 0,
  goals_against INT DEFAULT 0,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (season, group_name, team_id)
);

COMMENT ON TABLE public.standings IS 'Group standings for World Cup 2026';

CREATE INDEX IF NOT EXISTS idx_standings_group ON public.standings(group_name);
CREATE INDEX IF NOT EXISTS idx_standings_team ON public.standings(team_id);

-- ============================================
-- 5. FIXTURE EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.fixture_events (
  id            SERIAL PRIMARY KEY,
  fixture_id    INT NOT NULL REFERENCES public.fixtures(api_id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  elapsed       INT,
  extra_time    INT,
  team_id       INT REFERENCES public.teams(api_id),
  player_id     INT,
  player_name   TEXT,
  assist_id     INT,
  assist_name   TEXT,
  detail        TEXT,
  comments      TEXT,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.fixture_events IS 'Match events (goals, cards, subs) with raw payload';

CREATE INDEX IF NOT EXISTS idx_events_fixture ON public.fixture_events(fixture_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.fixture_events(event_type);

-- ============================================
-- 6. FIXTURE LINEUPS
-- ============================================
CREATE TABLE IF NOT EXISTS public.fixture_lineups (
  id            SERIAL PRIMARY KEY,
  fixture_id    INT NOT NULL REFERENCES public.fixtures(api_id) ON DELETE CASCADE,
  team_id       INT NOT NULL REFERENCES public.teams(api_id),
  formation     TEXT,
  coach_id      INT,
  coach_name    TEXT,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.fixture_lineups IS 'Match lineups with raw payload';

CREATE INDEX IF NOT EXISTS idx_lineups_fixture ON public.fixture_lineups(fixture_id);
CREATE INDEX IF NOT EXISTS idx_lineups_team ON public.fixture_lineups(team_id);

-- ============================================
-- 7. FIXTURE STATISTICS
-- ============================================
CREATE TABLE IF NOT EXISTS public.fixture_statistics (
  id            SERIAL PRIMARY KEY,
  fixture_id    INT NOT NULL REFERENCES public.fixtures(api_id) ON DELETE CASCADE,
  team_id       INT NOT NULL REFERENCES public.teams(api_id),
  stat_type     TEXT,
  stat_value    TEXT,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.fixture_statistics IS 'Match statistics with raw payload';

CREATE INDEX IF NOT EXISTS idx_stats_fixture ON public.fixture_statistics(fixture_id);
CREATE INDEX IF NOT EXISTS idx_stats_team ON public.fixture_statistics(team_id);

-- ============================================
-- 8. API SYNC LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_sync_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'started',
  records_processed INT DEFAULT 0,
  error_message TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  raw_request   JSONB,
  raw_response  JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.api_sync_logs IS 'Audit log for all data sync operations';

CREATE INDEX IF NOT EXISTS idx_sync_type ON public.api_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_status ON public.api_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_created ON public.api_sync_logs(created_at);

-- ============================================
-- 9. APP SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id            SERIAL PRIMARY KEY,
  key           TEXT UNIQUE NOT NULL,
  value         TEXT,
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.app_settings IS 'Application configuration settings';

-- Default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('last_fixtures_sync', NULL, 'Last successful fixtures sync timestamp'),
  ('last_teams_sync', NULL, 'Last successful teams sync timestamp'),
  ('last_standings_sync', NULL, 'Last successful standings sync timestamp'),
  ('api_rate_limit_remaining', '100', 'Remaining API calls for the day')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixture_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixture_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixture_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public read access for main tables
CREATE POLICY "Allow public read teams"
  ON public.teams FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read venues"
  ON public.venues FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read fixtures"
  ON public.fixtures FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read standings"
  ON public.standings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read fixture_events"
  ON public.fixture_events FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read fixture_lineups"
  ON public.fixture_lineups FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read fixture_statistics"
  ON public.fixture_statistics FOR SELECT TO anon, authenticated USING (true);

-- Sync logs and settings: only authenticated/admin write, public read for settings
CREATE POLICY "Allow public read app_settings"
  ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow authenticated write app_settings"
  ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write sync_logs"
  ON public.api_sync_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read sync_logs"
  ON public.api_sync_logs FOR SELECT TO anon, authenticated USING (true);

-- ============================================
-- FUNCTION: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTION: Reset API rate limit daily
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_api_rate_limit()
RETURNS void AS $$
BEGIN
  UPDATE public.app_settings
  SET value = '100',
      updated_at = NOW()
  WHERE key = 'api_rate_limit_remaining';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.reset_api_rate_limit() IS 'Resets daily API rate limit counter';

-- ============================================
-- COMPLETION
-- ============================================
SELECT 'Schema created successfully for Mundial Soccer 2026 Tracker!' AS status;

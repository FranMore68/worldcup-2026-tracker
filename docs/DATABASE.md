# DATABASE

Tables:
teams
venues
fixtures
standings
fixture_events
fixture_lineups
fixture_statistics
api_sync_logs
app_settings

Store raw payloads in JSONB.

## fixtures

| Column | Notes |
| ------ | ----- |
| `api_id` | OpenLigaDB match id. FIFA match ids are only used inside `raw_payload.fifa`. |
| `owner` | `openligadb` (default) or `fifa`. Indicates who owns the structural row. OpenLigaDB owns the bracket and the stable `api_id`; FIFA can create a row only when OpenLigaDB has not yet published that fixture. |
| `round` | Catalan label: `Grup X - Jornada N` or `Setzens de final`, `Vuitens de final`, etc. |
| `raw_payload` | `source: "openligadb"` plus the full API response; enriched with `fifa:` blob by `/api/sync-fifa`. |

## Deduplication

A fixture is uniquely identified by `(round, match_date_utc)`. When `/api/sync-fifa` processes a FIFA match:
- If a DB fixture already exists at that round + kickoff, FIFA enriches that row instead of creating a duplicate.
- If the existing row is owned by `openligadb`, that row remains canonical.
- FIFA only creates a new fixture when no row exists for that round + kickoff.

This allows both APIs to coexist even though they use different match ids and occasionally different kickoff times.

## Migrations

Migration files live in `app/supabase/migrations/` and should be run manually in Supabase SQL Editor for production.

- `20260627_add_fixture_owner.sql` — adds `owner` column to `fixtures`, backfills existing rows to `openligadb`, and adds an index on `owner`.

## Suggested indexes

- `fixtures(match_date_utc)`
- `fixtures(status_short)`
- `fixtures(home_team_id)`
- `fixtures(away_team_id)`
- `fixtures(owner)`

## Standings unique

`(season, group_name, team_id)`

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
| `home_goals` | Regular/extra-time goals. |
| `away_goals` | Regular/extra-time goals. |
| `home_penalty_goals` | Penalty shootout goals; only set for knockout matches that went to penalties. Source: FIFA. |
| `away_penalty_goals` | Penalty shootout goals; only set for knockout matches that went to penalties. Source: FIFA. |
| `owner` | `openligadb` (default) or `fifa`. OpenLigaDB owns the bracket, api_id, round and teams. FIFA enriches existing rows and can only create group-stage fixtures when OpenLigaDB has not yet published them; FIFA never creates knockout fixtures. |
| `round` | Catalan label: `Grup X - Jornada N` or `Setzens de final`, `Vuitens de final`, etc. |
| `raw_payload` | `source: "openligadb"` plus the full API response; enriched with `fifa:` blob by `/api/sync-fifa`. |

## Deduplication

A fixture is uniquely identified by `(round, match_date_utc)`. When `/api/sync-fifa` processes a FIFA match:
- OpenLigaDB is the structural source: it creates rows with the stable `api_id`, round, teams and kickoff.
- FIFA enriches existing rows (`raw_payload.fifa`, score, status) instead of creating duplicates.
- For group-stage fixtures, FIFA may still create a row if OpenLigaDB has not yet published that match; when OpenLigaDB later publishes the same match, the `upsert` by `api_id` converts the row to `owner = 'openligadb'`.
- For knockout fixtures (R16+), FIFA **never** creates rows. The entire bracket comes from OpenLigaDB.

This allows both APIs to coexist even though they use different match ids and occasionally different kickoff times.

## Migrations

Migration files live in `app/supabase/migrations/` and should be run manually in Supabase SQL Editor for production.

- `20260627_add_fixture_owner.sql` — adds `owner` column to `fixtures`, backfills existing rows to `openligadb`, and adds an index on `owner`.
- `20260628_add_fixture_penalty_goals.sql` — adds `home_penalty_goals` and `away_penalty_goals` columns to `fixtures`, plus a partial index for matches with penalty data.

## Suggested indexes

- `fixtures(match_date_utc)`
- `fixtures(status_short)`
- `fixtures(home_team_id)`
- `fixtures(away_team_id)`
- `fixtures(owner)`

## Standings unique

`(season, group_name, team_id)`

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

Suggested indexes:
fixtures(match_date_utc)
fixtures(status_short)
fixtures(home_team_id)
fixtures(away_team_id)

Standings unique:
(season, group_name, team_id)

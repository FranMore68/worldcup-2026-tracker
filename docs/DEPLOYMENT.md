# DEPLOYMENT

Hostinger VPS
Coolify
Supabase Cloud

ENV:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SYNC_SECRET

NOTES:
- Sync data source is OpenLigaDB (not API-Football)
- No API key required for OpenLigaDB
- Supabase is the single source of truth

Healthcheck:
/api/health

Scheduled Tasks:
sync-fixtures
sync-standings
sync-live

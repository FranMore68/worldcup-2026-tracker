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

Scheduled Tasks (ver docs/DATA_SYNC.md):
/api/sync-openligadb?type=live  (cada 3 min en horario de partidos)
/api/sync-openligadb?type=all   (diaria)

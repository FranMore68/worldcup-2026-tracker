# AGENTS.md

PROJECT: FIFA World Cup 2026 Tracker

MANDATORY STACK:
- Next.js 15
- TypeScript Strict
- TailwindCSS
- shadcn/ui
- Supabase PostgreSQL
- API-Football
- Coolify
- Hostinger VPS

CRITICAL RULES:
1. ALL PUBLIC UI MUST BE IN CATALAN.
2. Never call API-Football from browser code.
3. Supabase is the source of truth.
4. Store raw API responses in JSONB.
5. Mobile-first.
6. No any types.
7. Use Zod.
8. Server Components by default.
9. No Vercel-specific features.
10. Read all docs before implementing.

ARCHITECTURE:
API-Football -> Sync Layer -> Supabase -> Next.js UI

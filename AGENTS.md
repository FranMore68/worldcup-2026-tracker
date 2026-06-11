# AGENTS.md

PROJECT: FIFA World Cup 2026 Tracker

PROJECT STRUCTURE:

Application source code:
/app

Documentation:
/docs

Implementation tasks:
/tasks

MANDATORY STACK:
- Next.js 15
- TypeScript Strict
- TailwindCSS
- shadcn/ui
- Supabase PostgreSQL
- OpenLigaDB (formerly API-Football)
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
11. Application source code is located in /app.
12. Read all files inside /docs before implementation.
13. Read all files inside /tasks before implementation.
14. Documentation is authoritative.
15. If assumptions conflict with documentation, documentation wins.


ARCHITECTURE:
OpenLigaDB -> Sync Layer -> Supabase -> Next.js UI

IMPLEMENTATION WORKFLOW:

1. Read AGENTS.md
2. Read all files in /docs
3. Read all files in /tasks
4. Analyze project
5. Produce implementation plan
6. Only then start coding

DO NOT start implementation immediately after loading the repository.

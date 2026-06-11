# World Cup 2026 Tracker

Personal FIFA World Cup 2026 tracking application.

## Project Overview

This project aims to build a modern web application for tracking the FIFA World Cup 2026.

The application is designed for personal use, family and friends.

The system will provide:

- Full World Cup calendar
- Group standings
- Knockout bracket
- Match details
- Team pages
- Match events
- Statistics
- Synchronization status

## Technology Stack

### Frontend

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend

- Next.js Route Handlers
- Server Actions

### Database

- Supabase PostgreSQL

### External Provider

- OpenLigaDB

### Infrastructure

- Coolify
- Hostinger VPS

## Language Requirements

All public-facing UI must be written in Catalan.

Examples:

- Calendari
- Classificació
- Eliminatòries
- Partits d'avui
- Última actualització

Technical documentation and source code may remain in English.

## Project Structure

```
/
├── AGENTS.md
├── docs/
├── tasks/
├── Dockerfile
├── .dockerignore
└── app/
```

## Documentation

Project requirements and architecture are located in:

```
docs/
```

Implementation tasks are located in:

```
tasks/
```

## Development Rules

Read AGENTS.md before making any implementation decision.

API-Football must never be called directly from browser code.

Supabase is the source of truth.

All public UI must be in Catalan.

## Deployment

### Coolify (Production)

1. Connect your GitHub repository to Coolify
2. Select the repository and branch
3. Coolify will automatically detect the `Dockerfile` at the root
4. Set the following environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SYNC_SECRET`
5. Deploy!

### Local Development

```bash
cd app
npm install
npm run dev
```

### Build Locally

```bash
cd app
npm install
npm run build
```

## Current Status

Project build system is configured and ready for deployment.

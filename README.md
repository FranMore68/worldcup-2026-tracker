# World Cup 2026 Tracker

Open-source tracker for the FIFA World Cup 2026 (11 June – 19 July 2026).

A modern, mobile-first web application that shows the full tournament calendar,
group standings, knockout bracket, match details, teams, live scores and match
events — all in Catalan.

> **Disclaimer:** This is an unofficial fan project. It is not affiliated with,
> endorsed by, or sponsored by FIFA. Match data comes from public sources
> (OpenLigaDB and the undocumented FIFA.com public API).

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

- OpenLigaDB (datos del Mundial 2026)

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

External data APIs (OpenLigaDB) must never be called directly from browser code.

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

- ✅ Live in production and deployed via Coolify.
- ✅ Automatic data sync from OpenLigaDB and FIFA.com.
- ✅ Live scores, standings, knockout bracket and match events.
- ✅ Open source under the MIT License.

## License

[MIT](./LICENSE)

## Contributing

This project is primarily maintained for the 2026 World Cup. Issues and pull
requests are welcome, especially bug fixes and data-source improvements.
Please keep the public UI in Catalan and read `AGENTS.md` before contributing.

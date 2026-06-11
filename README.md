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

txt / ├── AGENTS.md ├── docs/ ├── tasks/ └── app/ 

## Documentation

Project requirements and architecture are located in:

txt docs/ 

Implementation tasks are located in:

txt tasks/ 

## Development Rules

Read AGENTS.md before making any implementation decision.

External data APIs (OpenLigaDB) must never be called directly from browser code.

Supabase is the source of truth.

All public UI must be in Catalan.

## Current Status

Project setup and documentation phase.
Implementation has not started yet.

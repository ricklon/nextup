# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NextUp is a tournament match assignment tool that helps referees assign matches to arenas during tournaments. It integrates True Finals tournament data with OBS streaming overlays. Refs use mobile devices to select matches and assign them to arenas, which automatically updates OBS scenes with player info.

## Tech Stack

- **Frontend:** Vite + TypeScript (intended for Svelte, currently boilerplate)
- **Backend:** Cloudflare Workers + D1 SQLite
- **External APIs:** True Finals REST API, OBS WebSocket
- **Package Manager:** pnpm (v10.23.0) with workspaces

## Development Commands

```bash
# Install dependencies
pnpm install

# Run frontend dev server (port 5173)
pnpm dev

# Run Cloudflare Worker locally
pnpm dev:worker

# Run both frontend and worker in parallel
pnpm dev:all

# Build frontend for production
pnpm build

# Deploy worker to Cloudflare
pnpm deploy:worker
```

### Backend-specific commands (from /backend)

```bash
# Create D1 database (first time setup)
pnpm wrangler d1 create tournament-assignments
# Then update wrangler.toml with the database_id from output

# Apply schema to D1 database
pnpm wrangler d1 execute tournament-assignments --file=schema.sql

# Type check backend
pnpm exec tsc --noEmit
```

## Architecture

```
Frontend (Vite/TS) ──► True Finals API (poll for matches)
        │
        ├──► OBS WebSocket (scene switching + overlay updates)
        │
        └──► Cloudflare Worker ──► D1 SQLite (assignment storage)
```

### Data Flow

1. Frontend polls True Finals API for tournament/match data
2. Ref selects arena and match, clicks assign
3. POST to `/api/assignments` stores assignment in D1
4. Frontend calls OBS WebSocket to switch scene and update text overlays
5. Frontend polls assignments endpoint to stay in sync

### Worker API Endpoints

- `GET /api/assignments?tournamentId={id}` - Fetch all assignments for tournament
- `POST /api/assignments` - Create/update assignment (upsert on tournament_id + match_id)
- `DELETE /api/assignments/{matchId}?tournamentId={id}` - Remove assignment

### D1 Schema

Single `assignments` table with unique constraint on `(tournament_id, match_id)`. Uses upsert pattern for reassignments.

## Environment Setup

Copy `.env.template` to `.env` and fill in:
- `VITE_TF_USER_ID` / `VITE_TF_API_KEY` - True Finals credentials
- `VITE_OBS_URL` - OBS WebSocket URL (default: `ws://localhost:4444`)
- `VITE_WORKER_URL` - Deployed worker URL

For backend, update `backend/wrangler.toml` with your D1 `database_id` after creating the database.

## OBS Integration Notes

- Scene names in OBS must match arena names exactly (case-sensitive)
- Each arena scene needs text sources: `MatchName`, `BracketName`, `RoundNumber`, `ScoreToWin`, `Player1Name`, `Player1Tag`, `Player1Seed`, `Player2Name`, `Player2Tag`, `Player2Seed`
- OBS WebSocket server must be enabled: Tools → WebSocket Server Settings

## Current State

The frontend is currently Vite boilerplate. The Svelte components described in TOURNAMENT_ASSIGNMENT_DESIGN.md are not yet implemented. The backend Worker API is functional.

## Key Files

- `TOURNAMENT_ASSIGNMENT_DESIGN.md` - Full architecture, API specs, component designs, OBS setup
- `SECURITY.md` - Authentication options (currently no auth)
- `DEPLOYMENT.md` - CI/CD and deployment instructions
- `backend/schema.sql` - D1 database schema

# NextUp - Tournament Match Assignment Tool

A referee-friendly web application that integrates True Finals tournament data with OBS streaming to manage match-to-arena assignments in real-time.

## Overview

During tournaments, referees use their phones to:
1. Select available matches from the tournament bracket
2. Assign matches to specific arenas
3. Automatically update OBS overlays with player info and bracket details

## Project Structure

```
nextup/
├── frontend/          # Svelte + Vite web application
├── backend/           # Cloudflare Worker API + D1 Database
├── .env.template      # Environment variables template
└── TOURNAMENT_ASSIGNMENT_DESIGN.md  # Detailed architecture docs
```

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account (for deployment)
- True Finals API credentials
- OBS with WebSocket plugin enabled

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.template .env
   # Fill in your API keys and configuration
   ```

3. **Set up backend:**
   ```bash
   cd backend
   pnpm install
   pnpm wrangler d1 create tournament-assignments
   # Update wrangler.toml with database_id
   pnpm wrangler d1 execute tournament-assignments --file=schema.sql
   ```

4. **Run development servers:**
   ```bash
   # From root directory
   pnpm dev          # Run frontend only
   pnpm dev:worker   # Run worker only
   pnpm dev:all      # Run both in parallel
   ```

## Technology Stack

- **Frontend:** Svelte + Vite + TypeScript
- **Backend:** Cloudflare Workers + D1 (SQLite)
- **APIs:** True Finals REST API, OBS WebSocket
- **Deployment:** Cloudflare Workers, Vercel/Netlify/Cloudflare Pages

## Documentation

See [TOURNAMENT_ASSIGNMENT_DESIGN.md](TOURNAMENT_ASSIGNMENT_DESIGN.md) for:
- Complete architecture details
- API specifications
- OBS integration setup
- Frontend component design
- Deployment instructions

## Development

- `pnpm dev` - Start frontend dev server
- `pnpm dev:worker` - Start Cloudflare Worker locally
- `pnpm build` - Build frontend for production
- `pnpm deploy:worker` - Deploy worker to Cloudflare

## CI/CD & Deployment

This project uses GitHub Actions for automated testing and deployment.

### Automated Workflows

- **Test** ([.github/workflows/test.yml](.github/workflows/test.yml)) - Runs on every push and pull request
  - Frontend build and tests
  - Backend type checking and tests
  - Linting and formatting checks

- **Deploy** ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) - Runs on push to `main`
  - Deploys Cloudflare Worker
  - Deploys frontend to Cloudflare Pages (or Vercel/Netlify)

### Setup GitHub Secrets

Before deployment works, you need to configure GitHub secrets. See [.github/SECRETS.md](.github/SECRETS.md) for detailed instructions.

Required secrets:
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `VITE_TF_USER_ID` - True Finals user ID
- `VITE_TF_API_KEY` - True Finals API key
- `VITE_WORKER_URL` - Deployed worker URL
- `VITE_OBS_URL` - OBS WebSocket URL
- `VITE_OBS_PASSWORD` - OBS WebSocket password (optional)

### Manual Deployment

You can also trigger deployments manually:
1. Go to the "Actions" tab in GitHub
2. Select "Deploy" workflow
3. Click "Run workflow"

## License

ISC
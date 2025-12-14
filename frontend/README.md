# Tournament Assignment UI - Frontend

Svelte-based web application for referees to assign tournament matches to arenas with OBS integration.

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   ```bash
   cp ../.env.template .env.local
   ```

   Fill in your:
   - True Finals API credentials
   - OBS WebSocket URL and password
   - Cloudflare Worker URL

3. **Run development server:**
   ```bash
   pnpm dev
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

## Features

- **Tournament Selection** - Choose from available True Finals tournaments
- **Match Assignment** - Assign matches to specific arenas
- **OBS Integration** - Automatically update OBS scenes and overlays
- **Real-time Polling** - Stay synced with tournament data
- **Mobile-Optimized** - Large touch targets for phone/tablet use

## Technology Stack

- Svelte + Vite
- OBS WebSocket JS
- True Finals REST API
- TypeScript

## Development

See `TOURNAMENT_ASSIGNMENT_DESIGN.md` in the root directory for detailed architecture and implementation notes.

# Tournament Worker - Backend API

Cloudflare Worker API for managing tournament match-to-arena assignments.

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Create D1 Database:**
   ```bash
   pnpm wrangler d1 create tournament-assignments
   ```

   Copy the `database_id` from the output and update it in `wrangler.toml`.

3. **Initialize Database Schema:**
   ```bash
   pnpm wrangler d1 execute tournament-assignments --file=schema.sql
   ```

4. **Run locally:**
   ```bash
   pnpm dev
   ```

5. **Deploy to Cloudflare:**
   ```bash
   pnpm deploy
   ```

## API Endpoints

### GET `/api/assignments?tournamentId={id}`
Fetch all assignments for a tournament.

### POST `/api/assignments`
Create or update a match assignment.

**Body:**
```json
{
  "tournamentId": "tournament-123",
  "matchId": "match-42",
  "arenaId": "arena-1",
  "arenaName": "Arena 1",
  "assignedBy": "Ref Name (optional)"
}
```

### DELETE `/api/assignments/:matchId?tournamentId={id}`
Remove a match assignment.

## Development

The worker uses:
- **TypeScript** for type safety
- **Cloudflare D1** for SQLite database
- **CORS enabled** for cross-origin requests from frontend

# Tournament Match Assignment Tool - Design Document

## Project Overview

A referee-friendly web application that integrates True Finals tournament data with OBS streaming to manage match-to-arena assignments in real-time. Refs use their phone to select available matches and assign them to specific arenas, automatically updating the OBS overlay with player info and bracket details.

**Use Case:** During a tournament, refs need to quickly see what matches are on deck and assign them to available arenas. When they assign a match, OBS switches to the correct arena scene and populates all player/bracket information automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Svelte + Vite (Frontend)                                    │
│ ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│ │ Ref Phone   │ │ True Finals  │ │ OBS WebSocket        │  │
│ │ UI (mobile) │─→ API (poll)  │─→ (scene + overlay)    │  │
│ └─────────────┘ └──────────────┘ └──────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                ┌──────┴──────┐
                │             │
        ┌───────▼────────┐    │
        │ Cloudflare     │    │
        │ Worker API     │    │
        │ /api/          │    │
        │ assignments    │    │
        └────────────────┘    │
                │         ┌───▼────────┐
                │         │ D1 SQLite  │
                └────────→│ Database   │
                          └────────────┘
```

---

## Technology Stack

- **Frontend:** Svelte + Vite + pnpm
- **Backend:** Cloudflare Workers (serverless Node.js)
- **Database:** Cloudflare D1 (SQLite)
- **External APIs:** 
  - True Finals REST API (read tournament/match data)
  - OBS WebSocket (control scenes & text sources)
- **Deployment:** Wrangler CLI (Cloudflare)

---

## Data Model

### D1 Database Schema

```sql
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  arena_id TEXT NOT NULL,
  arena_name TEXT NOT NULL,
  assigned_at INTEGER NOT NULL,
  assigned_by TEXT,
  UNIQUE(tournament_id, match_id)
);

CREATE INDEX idx_tournament_arena 
  ON assignments(tournament_id, arena_id);
```

**Key Concepts:**
- `match_id` comes from True Finals `games[].id`
- `arena_id` comes from True Finals `locations[].id`
- Upsert pattern: reassigning a match updates existing row
- `assigned_at` tracks when assignment happened
- `assigned_by` tracks which ref made the assignment (optional, for audit)

---

## API Endpoints

### Backend (Cloudflare Worker)

#### GET `/api/assignments`
Fetch all assignments for a tournament.

**Query Params:**
- `tournamentId` (required): True Finals tournament ID

**Response:**
```json
[
  {
    "id": "tournament-123-match-42-1702512000000",
    "tournament_id": "tournament-123",
    "match_id": "match-42",
    "arena_id": "arena-1",
    "arena_name": "Arena 1",
    "assigned_at": 1702512000,
    "assigned_by": "Ref Name"
  }
]
```

---

#### POST `/api/assignments`
Create or update a match-to-arena assignment.

**Body:**
```json
{
  "matchId": "match-42",
  "arenaId": "arena-1",
  "arenaName": "Arena 1",
  "assignedBy": "Ref Name (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "matchId": "match-42",
  "arenaId": "arena-1",
  "arenaName": "Arena 1"
}
```

**Behavior:**
- If `matchId` already assigned to a different arena, update it (upsert)
- If assigning to same arena, no-op (succeeds silently)

---

#### DELETE `/api/assignments/:matchId`
Unassign a match from its arena.

**Path Params:**
- `matchId`: True Finals match ID

**Response:**
```json
{
  "success": true
}
```

---

### External APIs (Used by Frontend)

#### True Finals API
**Base:** `https://truefinals.com/api`

**Headers (all requests):**
```
x-api-user-id: {API_USER_ID}
x-api-key: {API_KEY}
```

**Endpoints Used:**
- `GET /v1/tournaments/{tournamentID}` - Fetch tournament data (matches, arenas, players)
- `GET /v1/user/tournaments` - List tournaments for ref to select

---

#### OBS WebSocket
**Local Server:** `ws://localhost:4444` (or custom port/IP)

**Commands Used:**
- `SetCurrentProgramScene({ sceneName: "Arena 1" })` - Switch to arena scene
- `SetInputSettings({ sceneName, inputName, inputSettings: { text } })` - Update text sources

---

## Frontend Components

### Main Layout: `App.svelte`

Root component, handles:
- Tournament selection
- OBS connection status
- Route to either assignment flow or ref view

---

### Component: `TournamentSelector.svelte`

Displays list of available tournaments from True Finals API.

**Props:** None

**State:**
- `tournaments`: Array of tournaments from True Finals
- `selectedTournament`: Currently selected tournament ID
- `loading`: Fetch state

**Functions:**
- `fetchTournaments()` - Call True Finals `/v1/user/tournaments`
- `selectTournament(id)` - Load tournament data + start polling

---

### Component: `RefAssignmentUI.svelte`

Three-step ref workflow for assigning matches to arenas.

**Props:**
- `tournament`: Tournament object from True Finals
- `assignments`: Current assignments from D1

**State:**
- `selectedArena`: Currently selected arena ID
- `selectedMatch`: Currently selected match ID
- `loading`: Fetch/submit state
- `error`: Error message if assignment fails

**Step 1: Select Arena**
- Display arena tabs (large touch targets, 48px+)
- Show arena name and current active match
- Horizontal scroll if many arenas

**Step 2: Select Match**
- List all unassigned matches (filter out already assigned)
- Show match name + player names for each
- Scrollable list

**Step 3: Confirm & Assign**
- Big green button: "Assign to [Arena Name]"
- On success, reset state and stay in flow

**Functions:**
- `assignMatchToArena(matchId, arenaId, arenaName)` - POST to worker + OBS update
- `getUnassignedMatches()` - Filter tournament.games
- `getOnDeckQueue(arenaId)` - Return matches queued for that arena

---

### Component: `ArenaStatusBoard.svelte`

Display-only view showing current assignments by arena.

**Props:**
- `tournament`: Tournament object
- `assignments`: Current assignments from D1

**Content:**
- Card per arena showing:
  - Arena name
  - Currently assigned match
  - Player names
  - Match status

---

### Component: `OBSStatus.svelte`

Small indicator showing OBS connection status.

**Props:**
- `connected`: Boolean

**Display:**
- Green dot + "OBS Connected"
- Red dot + "OBS Disconnected (check URL/password)"

---

## Frontend Data Flow

### Initialization
```
App.svelte mounts
  ↓
Connect to OBS WebSocket (store obs instance in context)
  ↓
Fetch True Finals tournaments
  ↓
Ref selects tournament
  ↓
Start polling True Finals API every 2 seconds
  ↓
Start polling D1 assignments every 2 seconds
```

### Assignment Flow
```
Ref selects arena → selects match → clicks "Assign"
  ↓
POST /api/assignments (D1 update)
  ↓
OBS.call('SetCurrentProgramScene', ...)
  ↓
updateOBSOverlay(game, arenaName)
  ├─ Extract player info from tournament.players
  ├─ Build overlay data (names, tags, seeds, bracket)
  └─ OBS.call('SetInputSettings', ...) for each text source
  ↓
Poll /api/assignments immediately (update local state)
  ↓
Clear selectedMatch, stay in assignment flow for next assignment
```

---

## OBS Integration Details

### Scene Setup (Per Arena)

Create a scene for each arena in OBS (e.g., "Arena 1", "Arena 2").

**Required Text Sources in Each Scene:**

| Source Name | Content | Example |
|---|---|---|
| `MatchName` | Match identifier | "Match #42" |
| `BracketName` | Bracket name | "Winners Bracket" |
| `RoundNumber` | Round info | "Round 3" |
| `ScoreToWin` | Score target | "First to 3" |
| `Player1Name` | P1 display name | "Ali" |
| `Player1Tag` | P1 gamer tag | "Ali#1234" |
| `Player1Seed` | P1 seed number | "#5" |
| `Player2Name` | P2 display name | "Bob" |
| `Player2Tag` | P2 gamer tag | "Bob#9876" |
| `Player2Seed` | P2 seed number | "#2" |
| `Player1Photo` (optional) | P1 photo | Image URL |
| `Player2Photo` (optional) | P2 photo | Image URL |

**OBS WebSocket Configuration:**
- Enable WebSocket server in OBS: Tools → WebSocket Server Settings
- Default: `ws://localhost:4444`
- Set password if needed (frontend must pass in connection)

---

### Overlay Update Logic

When ref assigns match, `updateOBSOverlay()` executes:

```typescript
async function updateOBSOverlay(game, arenaName) {
  // 1. Fetch player details from tournament.players
  const player1 = tournament.players.find(p => p.id === game.slots[0]?.playerID);
  const player2 = tournament.players.find(p => p.id === game.slots[1]?.playerID);

  // 2. Map bracket IDs to human-readable names
  const bracketMap = {
    'W': 'Winners Bracket',
    'L': 'Losers Bracket',
    'EX': 'Exhibition',
    'RR': 'Round Robin'
  };

  // 3. Prepare updates
  const updates = [
    { inputName: 'MatchName', text: game.name },
    { inputName: 'BracketName', text: bracketMap[game.bracketID] },
    { inputName: 'RoundNumber', text: `Round ${game.round}` },
    { inputName: 'ScoreToWin', text: `First to ${game.scoreToWin}` },
    { inputName: 'Player1Name', text: player1?.name || '—' },
    { inputName: 'Player1Tag', text: player1?.profileInfo?.tag || '—' },
    { inputName: 'Player1Seed', text: player1?.seed ? `#${player1.seed}` : '—' },
    { inputName: 'Player2Name', text: player2?.name || '—' },
    { inputName: 'Player2Tag', text: player2?.profileInfo?.tag || '—' },
    { inputName: 'Player2Seed', text: player2?.seed ? `#${player2.seed}` : '—' },
  ];

  // 4. Send to OBS
  for (const update of updates) {
    await obs.call('SetInputSettings', {
      sceneName: arenaName,
      inputName: update.inputName,
      inputSettings: { text: update.text }
    });
  }

  // 5. Optional: Update photos
  if (player1?.photoUrl) {
    await obs.call('SetInputSettings', {
      sceneName: arenaName,
      inputName: 'Player1Photo',
      inputSettings: { file: player1.photoUrl }
    });
  }
}
```

---

## Environment Variables

### Frontend (.env.local)
```
VITE_TF_USER_ID=your-true-finals-user-id
VITE_TF_API_KEY=your-true-finals-api-key
VITE_OBS_URL=ws://localhost:4444
VITE_OBS_PASSWORD=your-obs-password (optional)
VITE_WORKER_URL=https://your-worker.your-account.workers.dev
VITE_TOURNAMENT_ID=default-tournament-id (can be overridden in UI)
```

### Backend (wrangler.toml)
```toml
name = "tournament-worker"
type = "service"
account_id = "your-account-id"
workers_dev = true

[[d1_databases]]
binding = "DB"
database_name = "tournament-assignments"
database_id = "your-database-id"

[env.production]
vars = { TOURNAMENT_ID = "your-tournament-id" }
```

---

## Deployment Steps

### 1. Cloudflare Worker Setup
```bash
npm create cloudflare@latest tournament-worker -- --type standard
cd tournament-worker
wrangler d1 create tournament-assignments
# Copy database_id from output into wrangler.toml
wrangler deploy
```

### 2. D1 Database Schema
```bash
wrangler d1 execute tournament-assignments --file=schema.sql
```

### 3. Frontend Vite Project
```bash
npm create vite@latest tournament-assignment-ui -- --template svelte
cd tournament-assignment-ui
pnpm install
pnpm add obs-websocket
# Create .env.local with vars above
pnpm run dev
```

### 4. Production Deployment
```bash
# Frontend: Deploy to Vercel, Netlify, or Cloudflare Pages
pnpm run build
# Point to deployed worker URL in .env.production

# Backend: Already deployed via wrangler
wrangler deploy --env production
```

---

## Error Handling & Resilience

### True Finals API Failures
- **Offline detection:** If poll fails, show cached data + "⚠️ Offline" badge
- **Retry logic:** Exponential backoff (2s → 4s → 8s)
- **Fallback:** Display last known tournament state

### OBS Connection Failures
- **Connection error:** Show "OBS Disconnected" + instructions
- **Send failure:** Log error, alert ref, allow retry
- **Recovery:** Auto-reconnect every 5s

### D1 Assignment Failures
- **Network error:** Show "Failed to save assignment"
- **Database error:** Log to console, suggest refresh
- **Retry:** User can click "Assign" again

### Graceful Degradation
- Refs can still view matches/arenas if D1 is down (read-only mode)
- OBS updates can fail without blocking ref UI
- True Finals data is always fetched fresh (cache never stale for >5s)

---

## Testing Checklist

- [ ] Ref can select tournament from list
- [ ] True Finals data loads and polls correctly
- [ ] OBS connection shows status (connected/disconnected)
- [ ] Ref can select arena and match
- [ ] Assignment POSTs to D1 successfully
- [ ] OBS scene switches to correct arena
- [ ] OBS overlay updates with player/bracket info
- [ ] Assignments list shows current state
- [ ] Unassign (DELETE) removes from D1
- [ ] Reassign (same match, different arena) updates correctly
- [ ] Phone UI is responsive and touch-friendly
- [ ] Dark mode readability in bright venues
- [ ] Offline handling shows cached data + warning
- [ ] OBS disconnection doesn't crash frontend

---

## Future Enhancements

- [ ] Ref authentication & audit log
- [ ] Multi-device sync (real-time, not just polling)
- [ ] Match result integration (auto-advance queue)
- [ ] Manual override (force unassign even if active)
- [ ] Undo/history of assignments
- [ ] Arena status (blocked, unavailable)
- [ ] Mobile app (PWA or native)
- [ ] Bracket tree visualization
- [ ] Photo carousel for player intro
- [ ] Sound notification on assignment

---

## File Structure

```
tournament-assignment-ui/  (Svelte frontend)
├── src/
│   ├── App.svelte
│   ├── components/
│   │   ├── TournamentSelector.svelte
│   │   ├── RefAssignmentUI.svelte
│   │   ├── ArenaStatusBoard.svelte
│   │   ├── OBSStatus.svelte
│   │   └── shared/
│   │       ├── ErrorAlert.svelte
│   │       └── LoadingSpinner.svelte
│   ├── stores/
│   │   ├── tournament.js (tournament data store)
│   │   ├── assignments.js (D1 assignments store)
│   │   └── obs.js (OBS connection store)
│   ├── api/
│   │   ├── trueFinals.js (fetch True Finals)
│   │   ├── worker.js (fetch D1 assignments)
│   │   └── obs.js (OBS WebSocket wrapper)
│   ├── app.css (global styles)
│   └── main.js
├── .env.local
├── vite.config.js
└── package.json

tournament-worker/  (Cloudflare backend)
├── src/
│   └── index.ts (Worker handler)
├── schema.sql
├── wrangler.toml
└── package.json
```

---

## Notes for Development

- **True Finals API rate limits:** Check docs, likely generous but add backoff
- **OBS WebSocket password:** Can be empty if not set; test connection first
- **Arena naming:** Match OBS scene names exactly (case-sensitive)
- **Mobile first:** Test on actual phone/tablet before tournament
- **Venue wifi:** Expect latency; 2s poll is reasonable
- **Ref workflow:** Test with non-technical person to catch UX issues
- **OBS source names:** Document exact names somewhere accessible during tournament

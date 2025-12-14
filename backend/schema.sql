-- D1 Database Schema for Tournament Match Assignments

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  arena_id TEXT NOT NULL,
  arena_name TEXT NOT NULL,
  assigned_at INTEGER NOT NULL,
  assigned_by TEXT,
  UNIQUE(tournament_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_arena
  ON assignments(tournament_id, arena_id);

-- Index for faster lookups by tournament
CREATE INDEX IF NOT EXISTS idx_tournament
  ON assignments(tournament_id);

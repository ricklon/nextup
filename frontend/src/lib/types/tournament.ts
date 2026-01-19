export interface Player {
  id: string;
  name: string;
  tag?: string;
  seed?: number;
}

export interface Slot {
  player_id: string | null;
  prereq_match_id: string | null;
  prereq_condition: 'winner' | 'loser' | null;
}

export interface Game {
  id: string;
  name?: string; // e.g., "W:1-1" for display
  status: 'pending' | 'ready' | 'in_progress' | 'complete';
  bracket: 'W' | 'L' | 'EX' | 'RR';
  round: number;
  best_of: number;
  slots: [Slot, Slot];
  scores?: [number, number];
  winner_id?: string | null;
  availableSince?: number; // timestamp when match became ready
  nextGameIds?: string[]; // IDs of games that follow this one
}

export interface Location {
  id: string;
  name: string;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'complete';
  games: Game[];
  players: Player[];
  locations: Location[];
}

export interface TournamentListItem {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'complete';
  created_at: string;
}

export type BracketType = 'W' | 'L' | 'EX' | 'RR';

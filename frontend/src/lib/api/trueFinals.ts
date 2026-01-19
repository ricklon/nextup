import type { Tournament, TournamentListItem } from '../types/tournament.js';
import { getSettings } from '../stores/settings.js';

const BASE_URL = 'https://truefinals.com/api';

function getHeaders(): HeadersInit {
  const settings = getSettings();
  const userId = settings.tfUserId;
  const apiKey = settings.tfApiKey;

  if (!userId || !apiKey) {
    throw new Error('True Finals API credentials not configured. Go to Settings to add your credentials.');
  }

  return {
    'x-api-user-id': userId,
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  };
}

interface TrueFinalsAPITournament {
  id: string;
  title: string;
  privacy: string;
  createTime: number;
  endTime: number | null;
}

interface TrueFinalsAPISlot {
  playerID: string | null;
  prevGameID: string | null;
  score: number;
  slotState: string;
}

interface TrueFinalsAPIGame {
  id: string;
  name: string;
  bracketID: string;
  round: number;
  scoreToWin: number;
  slots: TrueFinalsAPISlot[];
  state: string;
  endTime: number | null;
  availableSince: number | null;
  nextGameSlotIDs: string[];
}

interface TrueFinalsAPIPlayer {
  id: string;
  name: string;
  seed: number;
  profileInfo?: { tag?: string } | null;
}

interface TrueFinalsAPILocation {
  id: string;
  name: string;
}

interface TrueFinalsAPITournamentDetail {
  id: string;
  title: string;
  endTime: number | null;
  players: TrueFinalsAPIPlayer[];
  locations: TrueFinalsAPILocation[];
  games: TrueFinalsAPIGame[];
}

export async function fetchTournaments(): Promise<TournamentListItem[]> {
  const response = await fetch(`${BASE_URL}/v1/user/tournaments`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tournaments: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const tournaments: TrueFinalsAPITournament[] = data.tournaments || data || [];

  // Transform API response to match our type
  return tournaments.map(t => ({
    id: t.id,
    name: t.title,
    status: t.endTime ? 'complete' : 'in_progress',
    created_at: new Date(t.createTime).toISOString()
  }));
}

function mapGameState(state: string): 'pending' | 'ready' | 'in_progress' | 'complete' {
  switch (state) {
    case 'available':
      return 'ready';
    case 'active':
      return 'in_progress';
    case 'complete':
      return 'complete';
    default:
      return 'pending';
  }
}

function mapBracket(bracketID: string): 'W' | 'L' | 'EX' | 'RR' {
  if (bracketID === 'W' || bracketID === 'L' || bracketID === 'EX' || bracketID === 'RR') {
    return bracketID;
  }
  return 'W'; // Default fallback
}

export async function fetchTournament(id: string): Promise<Tournament> {
  const response = await fetch(`${BASE_URL}/v1/tournaments/${id}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tournament: ${response.status} ${response.statusText}`);
  }

  const data: TrueFinalsAPITournamentDetail = await response.json();

  // Transform players
  const players = (data.players || []).map(p => ({
    id: p.id,
    name: p.name,
    tag: p.profileInfo?.tag,
    seed: p.seed
  }));

  // Transform games
  const games = (data.games || []).map(g => {
    const slot0 = g.slots[0];
    const slot1 = g.slots[1];

    // Extract game IDs from nextGameSlotIDs (format: "W-4+0" -> "W-4")
    const nextGameIds = (g.nextGameSlotIDs || [])
      .map(slotId => slotId.split('+')[0])
      .filter((id, index, arr) => arr.indexOf(id) === index); // dedupe

    return {
      id: g.id,
      name: g.name, // e.g., "W:1-1"
      status: mapGameState(g.state),
      bracket: mapBracket(g.bracketID),
      round: g.round,
      best_of: g.scoreToWin * 2 - 1, // scoreToWin 1 = Bo1, scoreToWin 2 = Bo3, etc.
      slots: [
        {
          player_id: slot0?.playerID || null,
          prereq_match_id: slot0?.prevGameID || null,
          prereq_condition: slot0?.prevGameID ? 'winner' as const : null
        },
        {
          player_id: slot1?.playerID || null,
          prereq_match_id: slot1?.prevGameID || null,
          prereq_condition: slot1?.prevGameID ? 'winner' as const : null
        }
      ] satisfies [import('../types/tournament.js').Slot, import('../types/tournament.js').Slot],
      scores: [slot0?.score || 0, slot1?.score || 0] as [number, number],
      winner_id: g.state === 'complete' ?
        ((slot0?.score || 0) > (slot1?.score || 0) ? slot0?.playerID : slot1?.playerID) : null,
      availableSince: g.availableSince || undefined,
      nextGameIds: nextGameIds.length > 0 ? nextGameIds : undefined
    };
  });

  // Transform locations
  const locations = (data.locations || []).map(l => ({
    id: l.id,
    name: l.name
  }));

  return {
    id: data.id,
    name: data.title,
    status: data.endTime ? 'complete' : 'in_progress',
    games,
    players,
    locations
  };
}

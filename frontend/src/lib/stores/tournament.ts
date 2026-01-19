import { writable, derived } from 'svelte/store';
import type { Tournament, TournamentListItem, Game, Location, Player, BracketType } from '../types/tournament.js';
import { fetchTournaments, fetchTournament } from '../api/trueFinals.js';
import { getSettings } from './settings.js';

export const tournaments = writable<TournamentListItem[]>([]);
export const tournamentsLoading = writable(false);
export const tournamentsError = writable<string | null>(null);

export const currentTournament = writable<Tournament | null>(null);
export const tournamentLoading = writable(false);
export const tournamentError = writable<string | null>(null);

export const selectedBracketFilter = writable<BracketType | 'all'>('all');

let pollInterval: ReturnType<typeof setInterval> | null = null;

function getDefaultArenas(): Location[] {
  const settings = getSettings();
  const arenas = settings.defaultArenas;

  if (!arenas || arenas.length === 0) return [];

  return arenas.map((name: string, index: number) => ({
    id: `default-arena-${index + 1}`,
    name: name.trim()
  }));
}

export const arenas = derived(currentTournament, ($tournament): Location[] => {
  const tournamentArenas = $tournament?.locations || [];
  if (tournamentArenas.length > 0) return tournamentArenas;
  return getDefaultArenas();
});

export const players = derived(currentTournament, ($tournament): Player[] => {
  return $tournament?.players || [];
});

export const allGames = derived(currentTournament, ($tournament): Game[] => {
  return $tournament?.games || [];
});

export const availableBrackets = derived(allGames, ($games): BracketType[] => {
  const brackets = new Set<BracketType>();
  $games.forEach(game => brackets.add(game.bracket));
  return Array.from(brackets).sort();
});

export const readyGames = derived(
  [allGames, selectedBracketFilter],
  ([$games, $filter]): Game[] => {
    const filtered = $games.filter(game => {
      const isReady = game.status === 'ready' || game.status === 'in_progress';
      const matchesBracket = $filter === 'all' || game.bracket === $filter;
      return isReady && matchesBracket;
    });

    // Sort by wait time (oldest first - lowest availableSince)
    return filtered.sort((a, b) => {
      const aTime = a.availableSince || Infinity;
      const bTime = b.availableSince || Infinity;
      return aTime - bTime;
    });
  }
);

// Games that are pending but will become ready when current games complete
export const upcomingGames = derived(
  [allGames, selectedBracketFilter],
  ([$games, $filter]): Game[] => {
    // Get IDs of ready/in_progress games
    const activeGameIds = new Set(
      $games
        .filter(g => g.status === 'ready' || g.status === 'in_progress')
        .map(g => g.id)
    );

    // Find pending games that depend on active games
    const upcoming = $games.filter(game => {
      if (game.status !== 'pending') return false;
      const matchesBracket = $filter === 'all' || game.bracket === $filter;
      if (!matchesBracket) return false;

      // Check if any prereq is an active game
      const prereq0 = game.slots[0].prereq_match_id;
      const prereq1 = game.slots[1].prereq_match_id;

      return (prereq0 && activeGameIds.has(prereq0)) ||
             (prereq1 && activeGameIds.has(prereq1));
    });

    // Sort by round (lower rounds first)
    return upcoming.sort((a, b) => a.round - b.round);
  }
);

export async function loadTournaments() {
  tournamentsLoading.set(true);
  tournamentsError.set(null);

  try {
    const data = await fetchTournaments();
    tournaments.set(data);
  } catch (error) {
    tournamentsError.set(error instanceof Error ? error.message : 'Failed to load tournaments');
  } finally {
    tournamentsLoading.set(false);
  }
}

export async function loadTournament(id: string) {
  tournamentLoading.set(true);
  tournamentError.set(null);

  try {
    const data = await fetchTournament(id);
    currentTournament.set(data);
  } catch (error) {
    tournamentError.set(error instanceof Error ? error.message : 'Failed to load tournament');
  } finally {
    tournamentLoading.set(false);
  }
}

export function startPolling(tournamentId: string, intervalMs?: number) {
  stopPolling();

  const settings = getSettings();
  const interval = intervalMs ?? settings.tournamentPollInterval;

  loadTournament(tournamentId);

  pollInterval = setInterval(() => {
    loadTournament(tournamentId);
  }, interval);
}

export function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export function selectTournament(id: string) {
  startPolling(id);
}

export function clearTournament() {
  stopPolling();
  currentTournament.set(null);
  tournamentError.set(null);
}

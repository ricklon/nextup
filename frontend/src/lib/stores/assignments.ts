import { writable, derived, get } from 'svelte/store';
import type { Assignment } from '../types/assignment.js';
import { getAssignments, createAssignment, deleteAssignment } from '../api/worker.js';
import { currentTournament, allGames, arenas } from './tournament.js';
import { getSettings } from './settings.js';
import type { Game, Location } from '../types/tournament.js';

export const assignments = writable<Assignment[]>([]);
export const assignmentsLoading = writable(false);
export const assignmentsError = writable<string | null>(null);

let pollInterval: ReturnType<typeof setInterval> | null = null;

export const assignmentsByMatch = derived(assignments, ($assignments): Map<string, Assignment> => {
  const map = new Map<string, Assignment>();
  $assignments.forEach(a => map.set(a.match_id, a));
  return map;
});

export const assignmentsByArena = derived(assignments, ($assignments): Map<string, Assignment> => {
  const map = new Map<string, Assignment>();
  $assignments.forEach(a => map.set(a.arena_id, a));
  return map;
});

export const unassignedGames = derived(
  [allGames, assignmentsByMatch],
  ([$games, $assignmentMap]): Game[] => {
    return $games.filter(game => {
      const isReady = game.status === 'ready' || game.status === 'in_progress';
      const isUnassigned = !$assignmentMap.has(game.id);
      return isReady && isUnassigned;
    });
  }
);

export const arenaAssignments = derived(
  [arenas, assignmentsByArena, allGames],
  ([$arenas, $assignmentMap, $games]): Array<{ arena: Location; assignment: Assignment | null; game: Game | null }> => {
    return $arenas.map(arena => {
      const assignment = $assignmentMap.get(arena.id) || null;
      const game = assignment ? $games.find(g => g.id === assignment.match_id) || null : null;
      return { arena, assignment, game };
    });
  }
);

export async function loadAssignments(tournamentId: string) {
  assignmentsLoading.set(true);
  assignmentsError.set(null);

  try {
    const data = await getAssignments(tournamentId);
    assignments.set(data);
  } catch (error) {
    assignmentsError.set(error instanceof Error ? error.message : 'Failed to load assignments');
  } finally {
    assignmentsLoading.set(false);
  }
}

export async function assignMatch(
  matchId: string,
  arenaId: string,
  arenaName: string,
  assignedBy?: string
): Promise<void> {
  const tournament = get(currentTournament);
  if (!tournament) {
    throw new Error('No tournament selected');
  }

  await createAssignment({
    tournamentId: tournament.id,
    matchId,
    arenaId,
    arenaName,
    assignedBy
  });

  await loadAssignments(tournament.id);
}

export async function unassignMatch(matchId: string): Promise<void> {
  const tournament = get(currentTournament);
  if (!tournament) {
    throw new Error('No tournament selected');
  }

  await deleteAssignment(tournament.id, matchId);
  await loadAssignments(tournament.id);
}

export function startAssignmentPolling(tournamentId: string, intervalMs?: number) {
  stopAssignmentPolling();

  const settings = getSettings();
  const interval = intervalMs ?? settings.assignmentPollInterval;

  loadAssignments(tournamentId);

  pollInterval = setInterval(() => {
    loadAssignments(tournamentId);
  }, interval);
}

export function stopAssignmentPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export function clearAssignments() {
  stopAssignmentPolling();
  assignments.set([]);
  assignmentsError.set(null);
}

export interface Assignment {
  id: string;
  tournament_id: string;
  match_id: string;
  arena_id: string;
  arena_name: string;
  assigned_at: number;
  assigned_by: string | null;
}

export interface CreateAssignmentRequest {
  tournamentId: string;
  matchId: string;
  arenaId: string;
  arenaName: string;
  assignedBy?: string;
}

export interface AssignmentResponse {
  success: boolean;
  matchId: string;
  arenaId: string;
  arenaName: string;
}

import type { Assignment, CreateAssignmentRequest, AssignmentResponse } from '../types/assignment.js';

function getBaseUrl(): string {
  const url = import.meta.env.VITE_WORKER_URL;
  if (!url) {
    throw new Error('Worker URL not configured. Set VITE_WORKER_URL in .env');
  }
  return url;
}

export async function getAssignments(tournamentId: string): Promise<Assignment[]> {
  const response = await fetch(
    `${getBaseUrl()}/api/assignments?tournamentId=${encodeURIComponent(tournamentId)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch assignments: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function createAssignment(request: CreateAssignmentRequest): Promise<AssignmentResponse> {
  const response = await fetch(`${getBaseUrl()}/api/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to create assignment: ${response.status}`);
  }

  return response.json();
}

export async function deleteAssignment(tournamentId: string, matchId: string): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/assignments/${encodeURIComponent(matchId)}?tournamentId=${encodeURIComponent(tournamentId)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete assignment: ${response.status} ${response.statusText}`);
  }
}

export interface Env {
	DB: D1Database;
}

interface Assignment {
	id: string;
	tournament_id: string;
	match_id: string;
	arena_id: string;
	arena_name: string;
	assigned_at: number;
	assigned_by: string | null;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// Enable CORS
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// GET /api/assignments?tournamentId=xxx
			if (path === '/api/assignments' && request.method === 'GET') {
				const tournamentId = url.searchParams.get('tournamentId');
				if (!tournamentId) {
					return new Response(
						JSON.stringify({ error: 'tournamentId is required' }),
						{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
					);
				}

				const { results } = await env.DB.prepare(
					'SELECT * FROM assignments WHERE tournament_id = ?'
				)
					.bind(tournamentId)
					.all<Assignment>();

				return new Response(JSON.stringify(results || []), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// POST /api/assignments
			if (path === '/api/assignments' && request.method === 'POST') {
				const body = await request.json() as {
					tournamentId: string;
					matchId: string;
					arenaId: string;
					arenaName: string;
					assignedBy?: string;
				};

				const { tournamentId, matchId, arenaId, arenaName, assignedBy } = body;

				if (!tournamentId || !matchId || !arenaId || !arenaName) {
					return new Response(
						JSON.stringify({ error: 'Missing required fields' }),
						{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
					);
				}

				const id = `${tournamentId}-${matchId}-${Date.now()}`;
				const assignedAt = Math.floor(Date.now() / 1000);

				await env.DB.prepare(
					`INSERT INTO assignments (id, tournament_id, match_id, arena_id, arena_name, assigned_at, assigned_by)
					 VALUES (?, ?, ?, ?, ?, ?, ?)
					 ON CONFLICT(tournament_id, match_id)
					 DO UPDATE SET arena_id = excluded.arena_id, arena_name = excluded.arena_name, assigned_at = excluded.assigned_at, assigned_by = excluded.assigned_by`
				)
					.bind(id, tournamentId, matchId, arenaId, arenaName, assignedAt, assignedBy || null)
					.run();

				return new Response(
					JSON.stringify({
						success: true,
						matchId,
						arenaId,
						arenaName,
					}),
					{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
				);
			}

			// DELETE /api/assignments/:matchId?tournamentId=xxx
			if (path.startsWith('/api/assignments/') && request.method === 'DELETE') {
				const matchId = path.split('/').pop();
				const tournamentId = url.searchParams.get('tournamentId');

				if (!matchId || !tournamentId) {
					return new Response(
						JSON.stringify({ error: 'matchId and tournamentId are required' }),
						{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
					);
				}

				await env.DB.prepare('DELETE FROM assignments WHERE tournament_id = ? AND match_id = ?')
					.bind(tournamentId, matchId)
					.run();

				return new Response(JSON.stringify({ success: true }), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			return new Response('Not Found', { status: 404, headers: corsHeaders });
		} catch (error) {
			console.error('Error:', error);
			return new Response(
				JSON.stringify({ error: 'Internal Server Error' }),
				{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
			);
		}
	},
};

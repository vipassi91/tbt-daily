import { isAdmin, json, unauthorized } from '../../_auth.js';
import { buildStats, validGame } from '../../_tables.js';

// GET /api/tables/:code: the host's edit code. Returns the raw game object.
export async function onRequestGet({ env, params }) {
  try {
    const t = await env.DB.prepare('SELECT label, rounds, updated_at FROM tables WHERE code=?').bind(params.code.toUpperCase()).first();
    if (!t) return json({ error: 'Table code not found' }, 404);
    return json({ label: t.label, updatedAt: t.updated_at, game: JSON.parse(t.rounds) });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// PATCH /api/tables/:code: the host saves the whole game. Results are computed
// here, once, and stored, so leaderboards never have to replay every hand.
export async function onRequestPatch({ request, env, params }) {
  try {
    const code = params.code.toUpperCase();
    const game = await request.json();
    if (!validGame(game)) return json({ error: 'Invalid game data' }, 400);
    const t = await env.DB.prepare('SELECT id, players FROM tables WHERE code=?').bind(code).first();
    if (!t) return json({ error: 'Table code not found' }, 404);

    let stats;
    try { stats = buildStats(game, JSON.parse(t.players)); } catch (e) { return json({ error: 'Invalid game data' }, 400); }
    const body = JSON.stringify(game);
    if (body.length > 200000) return json({ error: 'Game too large' }, 413);

    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE tables SET rounds=?, players=?, stats=?, updated_at=? WHERE code=?')
      .bind(body, JSON.stringify(stats.names), JSON.stringify(stats), now, code).run();
    return json({ ok: true, updatedAt: now });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// DELETE /api/tables/:code: admin only
export async function onRequestDelete({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await env.DB.prepare('DELETE FROM tables WHERE code=?').bind(params.code.toUpperCase()).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

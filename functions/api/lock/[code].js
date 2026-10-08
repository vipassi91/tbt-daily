import { isAdmin, json, unauthorized } from '../../_auth.js';
import { buildStats, validGame, nextStamp } from '../../_tables.js';

// POST /api/lock/:code (host code): save the final game and lock the table.
// The body is the host's game, so the final hands and the lock land in one
// atomic write. After this nobody can edit the table until an admin unlocks it.
export async function onRequestPost({ request, env, params }) {
  try {
    const code = params.code.toUpperCase();
    const t = await env.DB.prepare('SELECT id, players, rounds, updated_at FROM tables WHERE code=?').bind(code).first();
    if (!t) return json({ error: 'Table code not found' }, 404);
    let current = {};
    try { current = JSON.parse(t.rounds); } catch (e) { current = {}; }
    if (current.lockedAt) return json({ error: 'locked', lockedAt: current.lockedAt, updatedAt: t.updated_at, game: current }, 423);

    const base = request.headers.get('X-Base-Version');
    if (base && base !== t.updated_at) return json({ error: 'conflict', updatedAt: t.updated_at, game: current }, 409);

    let game = current, body = null;
    try { body = await request.json(); } catch (e) { body = null; }
    if (body && typeof body === 'object' && Object.keys(body).length) {
      if (!validGame(body)) return json({ error: 'Invalid game data' }, 400);
      game = body;
    }
    if (!Array.isArray(game.events) || game.events.length === 0) return json({ error: 'Nothing to save yet' }, 400);

    const now = nextStamp(t.updated_at);
    game.lockedAt = now;
    let stats;
    try { stats = buildStats(game, JSON.parse(t.players)); } catch (e) { return json({ error: 'Invalid game data' }, 400); }
    const text = JSON.stringify(game);
    if (text.length > 200000) return json({ error: 'Game too large' }, 413);

    const res = await env.DB.prepare('UPDATE tables SET rounds=?, players=?, stats=?, updated_at=? WHERE code=? AND updated_at=?')
      .bind(text, JSON.stringify(stats.names), JSON.stringify(stats), now, code, t.updated_at).run();
    if (!res.meta || res.meta.changes !== 1) {
      const fresh = await env.DB.prepare('SELECT rounds, updated_at FROM tables WHERE code=?').bind(code).first();
      return json({ error: 'conflict', updatedAt: fresh ? fresh.updated_at : null, game: fresh ? JSON.parse(fresh.rounds) : null }, 409);
    }
    return json({ ok: true, lockedAt: now, updatedAt: now });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// DELETE /api/lock/:code (admin only): reopen a saved table, e.g. after a mistaken Save.
export async function onRequestDelete({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const code = params.code.toUpperCase();
    const t = await env.DB.prepare('SELECT id, players, rounds, updated_at FROM tables WHERE code=?').bind(code).first();
    if (!t) return json({ error: 'Table code not found' }, 404);
    let game = {};
    try { game = JSON.parse(t.rounds); } catch (e) { game = {}; }
    if (!game.lockedAt) return json({ ok: true });
    delete game.lockedAt;
    const stats = buildStats(game, JSON.parse(t.players));
    const now = nextStamp(t.updated_at);
    const res = await env.DB.prepare('UPDATE tables SET rounds=?, stats=?, updated_at=? WHERE code=? AND updated_at=?')
      .bind(JSON.stringify(game), JSON.stringify(stats), now, code, t.updated_at).run();
    if (!res.meta || res.meta.changes !== 1) return json({ error: 'Table changed, try again' }, 409);
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

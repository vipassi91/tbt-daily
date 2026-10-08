import { isAdmin, json, unauthorized } from '../../_auth.js';
import { buildStats, validGame, nextStamp, sameSetup } from '../../_tables.js';

// GET /api/tables/:code: the host's edit code. Returns the raw game object
// (which carries `lockedAt` once the table has been saved as final).
export async function onRequestGet({ env, params }) {
  try {
    const t = await env.DB.prepare('SELECT label, rounds, updated_at FROM tables WHERE code=?').bind(params.code.toUpperCase()).first();
    if (!t) return json({ error: 'Table code not found' }, 404);
    return json({ label: t.label, updatedAt: t.updated_at, game: JSON.parse(t.rounds) });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// PATCH /api/tables/:code: the host saves the whole game.
//  - refused with 423 once the table is saved as final
//  - the client says which version it started from (X-Base-Version header); if the
//    table changed since, refused with 409 and the latest copy, so nothing is
//    silently overwritten. The final write is also compare-and-swap, so two
//    requests racing each other can't both win.
//  - results are computed here, once, and stored, so leaderboards never replay hands.
export async function onRequestPatch({ request, env, params }) {
  try {
    const code = params.code.toUpperCase();
    let game;
    try { game = await request.json(); } catch (e) { return json({ error: 'Invalid game data' }, 400); }
    if (!validGame(game)) return json({ error: 'Invalid game data' }, 400);

    const t = await env.DB.prepare('SELECT id, players, rounds, updated_at FROM tables WHERE code=?').bind(code).first();
    if (!t) return json({ error: 'Table code not found' }, 404);
    let current = {};
    try { current = JSON.parse(t.rounds); } catch (e) { current = {}; }

    if (current.lockedAt) return json({ error: 'locked', lockedAt: current.lockedAt, updatedAt: t.updated_at, game: current }, 423);
    const base = request.headers.get('X-Base-Version');
    if (base && base !== t.updated_at) return json({ error: 'conflict', updatedAt: t.updated_at, game: current }, 409);

    // Players and rules are fixed once the first hand is recorded (deleting every hand reopens them)
    if (Array.isArray(current.events) && current.events.length > 0 && !sameSetup(current, game)) {
      return json({ error: 'setup_locked', updatedAt: t.updated_at, game: current }, 422);
    }

    delete game.lockedAt; // the lock belongs to the server, never to the client

    let stats;
    try { stats = buildStats(game, JSON.parse(t.players)); } catch (e) { return json({ error: 'Invalid game data' }, 400); }
    const text = JSON.stringify(game);
    if (text.length > 200000) return json({ error: 'Game too large' }, 413);

    const now = nextStamp(t.updated_at);
    const res = await env.DB.prepare('UPDATE tables SET rounds=?, players=?, stats=?, updated_at=? WHERE code=? AND updated_at=?')
      .bind(text, JSON.stringify(stats.names), JSON.stringify(stats), now, code, t.updated_at).run();
    if (!res.meta || res.meta.changes !== 1) {
      const fresh = await env.DB.prepare('SELECT rounds, updated_at FROM tables WHERE code=?').bind(code).first();
      return json({ error: 'conflict', updatedAt: fresh ? fresh.updated_at : null, game: fresh ? JSON.parse(fresh.rounds) : null }, 409);
    }
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

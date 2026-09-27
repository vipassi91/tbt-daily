import { isAdmin, json, unauthorized } from '../../_auth.js';
import { scoreTable } from '../../_scoring.js';

// GET /api/days/:id -> public, day info + all its tables scored + combined leaderboard
export async function onRequestGet({ env, params }) {
  try {
    const day = await env.DB.prepare('SELECT * FROM days WHERE id=?').bind(params.id).first();
    if (!day) return json({ error: 'Day tidak ditemukan' }, 404);

    const { results: tableRows } = await env.DB.prepare(
      'SELECT * FROM tables WHERE day_id=? ORDER BY created_at ASC'
    ).bind(params.id).all();

    const tables = tableRows.map(t => {
      const players = JSON.parse(t.players);
      const roundsByWind = JSON.parse(t.rounds);
      const scored = scoreTable(players, roundsByWind, t.starting_score);
      return { id: t.id, code: t.code, label: t.label, players, startingScore: t.starting_score, ...scored };
    });

    // Combined leaderboard across all tables that day
    const leaderboard = [];
    tables.forEach(t => {
      t.players.forEach(p => {
        const a = t.aggregates[p];
        leaderboard.push({ player: p, table: t.label, code: t.code, ...a });
      });
    });

    return json({ ...day, tables, leaderboard });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// DELETE /api/days/:id -> admin only, removes the day and all its tables
export async function onRequestDelete({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await env.DB.prepare('DELETE FROM tables WHERE day_id=?').bind(params.id).run();
    await env.DB.prepare('DELETE FROM days WHERE id=?').bind(params.id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

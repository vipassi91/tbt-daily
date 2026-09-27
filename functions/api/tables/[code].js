import { json } from '../../_auth.js';
import { scoreTable } from '../../_scoring.js';

// GET /api/tables/:code -> public, fetch table data + live scoring by code
export async function onRequestGet({ env, params }) {
  try {
    const t = await env.DB.prepare('SELECT * FROM tables WHERE code=?').bind(params.code.toUpperCase()).first();
    if (!t) return json({ error: 'Kode meja tidak ditemukan' }, 404);
    const players = JSON.parse(t.players);
    const roundsByWind = JSON.parse(t.rounds);
    const scored = scoreTable(players, roundsByWind, t.starting_score);
    return json({
      id: t.id, code: t.code, label: t.label, players, roundsByWind,
      startingScore: t.starting_score, updatedAt: t.updated_at, ...scored,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// PATCH /api/tables/:code -> public, update the round-by-round hand data for this table.
// Anyone holding the code can write to it — the code itself is the access control,
// same as a shared "room code" pattern.
export async function onRequestPatch({ request, env, params }) {
  try {
    const body = await request.json(); // { roundsByWind, players? }
    const t = await env.DB.prepare('SELECT * FROM tables WHERE code=?').bind(params.code.toUpperCase()).first();
    if (!t) return json({ error: 'Kode meja tidak ditemukan' }, 404);

    const players = body.players && Array.isArray(body.players) && body.players.length === 4
      ? body.players : JSON.parse(t.players);

    await env.DB.prepare('UPDATE tables SET rounds=?, players=?, updated_at=? WHERE code=?')
      .bind(JSON.stringify(body.roundsByWind || {}), JSON.stringify(players), new Date().toISOString(), params.code.toUpperCase())
      .run();

    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

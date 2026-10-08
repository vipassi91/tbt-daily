import { json } from '../_auth.js';
import { buildStats, summarizePlayers } from '../_tables.js';

// GET /api/overview: everything the public leaderboard needs, from stored results.
// Never includes edit codes.
export async function onRequestGet({ env }) {
  try {
    const dayRes = await env.DB.prepare('SELECT id, label, date FROM days ORDER BY date DESC, created_at DESC').all();
    const tblRes = await env.DB.prepare('SELECT id, day_id, label, view_code, players, stats, updated_at FROM tables ORDER BY created_at ASC').all();
    const tables = [];
    for (const t of tblRes.results) {
      let stats = t.stats ? JSON.parse(t.stats) : null;
      if (!stats) {
        const full = await env.DB.prepare('SELECT rounds FROM tables WHERE id=?').bind(t.id).first();
        stats = buildStats(full ? JSON.parse(full.rounds) : {}, JSON.parse(t.players));
      }
      tables.push({
        id: t.id, day_id: t.day_id, label: t.label, view_code: t.view_code,
        events: stats.events, hands: stats.hands, progress: stats.progress, mode: stats.mode || 'casual', locked: !!stats.locked,
        updatedAt: t.updated_at, players: summarizePlayers(stats),
      });
    }
    return json({ days: dayRes.results, tables: tables });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

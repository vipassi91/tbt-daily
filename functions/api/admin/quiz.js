import { isAdmin, json, unauthorized } from '../../_auth.js';
import { ensureQuizTables } from '../../_quiz.js';

// GET /api/admin/quiz (admin): who took the quiz, newest first, and how many got each tile.   GET ?format=csv: the same as a spreadsheet file.
// POST { action: 'delete', id } (admin): removes one person.
function csvCell(v, keep) {
  let s = String(v == null ? '' : v);
  if (!keep && /^[=+\-@\t\r]/.test(s)) s = "'" + s;         // a cell that starts like a formula is made harmless in a spreadsheet
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await ensureQuizTables(env);
    const rows = (await env.DB.prepare('SELECT id, name, instagram, city, whatsapp, invite, tile, created_at, updated_at FROM quiz_leads ORDER BY updated_at DESC').all()).results;
    if (new URL(request.url).searchParams.get('format') === 'csv') {
      const head = ['name', 'instagram', 'city', 'whatsapp', 'wants_invites', 'tile', 'first_seen', 'last_seen'];
      const lines = [head.join(',')].concat(rows.map(function (r) { return [csvCell(r.name), csvCell('@' + r.instagram, true), csvCell(r.city), csvCell(r.whatsapp, true), r.invite ? 'yes' : 'no', csvCell(r.tile), r.created_at, r.updated_at].join(','); }));
      return new Response('\ufeff' + lines.join('\r\n') + '\r\n', { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="tbt-quiz-responses.csv"', 'Cache-Control': 'no-store' } });
    }
    const byTile = {}; rows.forEach(function (r) { byTile[r.tile] = (byTile[r.tile] || 0) + 1; });
    return json({ total: rows.length, byTile: byTile, leads: rows.slice(0, 500).map(function (r) { return { id: r.id, name: r.name, instagram: r.instagram, city: r.city, whatsapp: r.whatsapp, invite: !!r.invite, tile: r.tile, createdAt: r.created_at, updatedAt: r.updated_at }; }) });
  } catch (err) { return json({ error: String(err) }, 500); }
}
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await ensureQuizTables(env);
    let b; try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
    if (b && b.action === 'delete') { await env.DB.prepare('DELETE FROM quiz_leads WHERE id=?').bind(String(b.id || '')).run(); return json({ ok: true }); }
    return json({ error: 'Unknown action' }, 400);
  } catch (err) { return json({ error: String(err) }, 500); }
}

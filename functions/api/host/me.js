import { respond, requireHost, LIMITS, madeToday } from '../../_hostauth.js';

// GET /api/host/me: who is logged in, what they have made today, and their own sessions and tables with the codes.
export async function onRequestGet({ request, env }) {
  try {
    const g = await requireHost(request, env, { allowMustChange: true }); if (g.res) return g.res;
    const h = g.host;
    if (h.mustChange) return respond({ nickname: h.nickname, mustChange: true });
    const days = await env.DB.prepare('SELECT id, label, date, created_at FROM days WHERE created_by=? ORDER BY date DESC, created_at DESC').bind(h.id).all();
    const tbl = await env.DB.prepare('SELECT id, day_id, label, code, view_code, stats, created_at FROM tables WHERE created_by=? ORDER BY created_at ASC').bind(h.id).all();
    const by = {};
    tbl.results.forEach(function (t) {
      let hands = 0, locked = false;
      try { const s = JSON.parse(t.stats || '{}'); hands = s.hands || 0; locked = !!s.locked; } catch (e) { /* a table with unreadable stats shows as empty */ }
      (by[t.day_id] = by[t.day_id] || []).push({ id: t.id, label: t.label, code: t.code, viewCode: t.view_code, createdAt: t.created_at, hands: hands, locked: locked });
    });
    return respond({ nickname: h.nickname, mustChange: false, limits: LIMITS, made: await madeToday(env, h.id), today: new Date().toISOString(), sessions: days.results.map(function (d) { return { id: d.id, label: d.label, date: d.date, createdAt: d.created_at, tables: by[d.id] || [] }; }) });
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}

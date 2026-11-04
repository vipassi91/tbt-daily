import { json } from '../_auth.js';
import { statsFor } from '../_tables.js';
import { loadRegistryCached, seatOwner, nameKey } from '../_players.js';

// GET /api/players: every registered player's results, game by game, for the "All players" page.
// These are the same facts a player's own page uses (see playerPage), for everyone at once, so the two pages always agree.
// Public. Never includes edit codes, contact details, guests or players who have hidden their page.
// Like /api/overview the answer is kept at Cloudflare for 30 seconds and shared, so the database is read once per half minute.
const FRESH_SECONDS = 30;
export async function onRequestGet(context) {
  const { request, env } = context;
  let cache = null;
  try { cache = typeof caches !== 'undefined' ? caches.default : null; } catch (e) { cache = null; }
  const key = new Request(new URL(request.url).origin + '/api/players');
  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) { const r = new Response(hit.body, hit); r.headers.set('X-Cache', 'HIT'); return r; }
    } catch (e) { /* fall through and build it */ }
  }
  const built = await build(env);
  if (!built.ok) return built;                      // an error is never kept
  const out = new Response(built.body, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=' + FRESH_SECONDS, 'X-Content-Type-Options': 'nosniff' } });
  if (cache) {
    try {
      const put = cache.put(key, out.clone());
      if (context.waitUntil) context.waitUntil(put); else await put;
    } catch (e) { /* not cached this time */ }
  }
  out.headers.set('X-Cache', 'MISS');
  return out;
}

async function build(env) {
  try {
    const reg = await loadRegistryCached(env);
    // no registry yet: nobody is a registered player, so there is nothing to list (the page says so)
    if (!reg.ready || !reg.players.size) return json({ players: [], games: [], registry: false });
    const rows = (await env.DB.prepare('SELECT id, day_id, label, view_code, players, stats, updated_at FROM tables ORDER BY created_at ASC').all()).results;
    const days = {};
    (await env.DB.prepare('SELECT id, date FROM days').all()).results.forEach(function (d) { days[d.id] = d; });
    const budget = { left: 12 };   // see statsFor: old statistics are renewed a dozen tables per request
    const index = new Map(), players = [], games = [];
    let skipped = 0;
    for (const t of rows) {
      try {   // one table whose saved data is damaged is left out; it must not take the page down
        let names = []; try { names = JSON.parse(t.players); } catch (e) { names = []; }
        // only look at the table's statistics if a listed player sat there
        const sat = [];
        names.forEach(function (n, seat) {
          if (!n) return;
          const pl = reg.players.get(seatOwner(reg, t.id, seat, nameKey(n)).id);
          if (pl && !pl.hidden) sat.push({ seat: seat, pl: pl });
        });
        if (!sat.length) continue;
        const stats = await statsFor(env, t, budget);
        if (!stats.events) continue;
        const d = days[t.day_id] || {};
        for (const s of sat) {
          const name = stats.names[s.seat], f = (stats.facts && stats.facts[name]) || null, agg = stats.aggregates && stats.aggregates[name];
          if (!f || !agg) { skipped++; continue; }
          let pi = index.get(s.pl.id);
          if (pi === undefined) { pi = players.length; index.set(s.pl.id, pi); players.push({ id: s.pl.id, nickname: s.pl.nickname, since: (s.pl.createdAt || '').slice(0, 10) }); }
          games.push({
            p: pi, view: t.view_code, date: d.date || '', mode: stats.mode || 'casual',
            rank: stats.rank[name], net: Math.round(agg.netTotal * 100) / 100, hands: stats.hands, winds: stats.winds,
            won: f.won, windFirsts: f.windFirsts, ptsSum: f.ptsSum, best: f.best, zimo: f.zimo, dealIns: f.dealIns,
            zimoLost: f.zimoLost || 0, penalties: f.penalties || 0, low: f.low === undefined ? null : f.low, dealPts: f.dealPts || 0, streak: f.streak || 0,
            windsDone: stats.windsDone || 0, windHigh: f.windHigh === undefined ? null : f.windHigh, windLow: f.windLow === undefined ? null : f.windLow, windPlaceSum: f.windPlaceSum || 0,
          });
        }
      } catch (e) { skipped++; }
    }
    return json(skipped ? { players: players, games: games, registry: true, skipped: skipped } : { players: players, games: games, registry: true });
  } catch (err) {
    return json({ error: 'server' }, 500);
  }
}

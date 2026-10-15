import { json } from '../_auth.js';
import { statsFor, summarizePlayers } from '../_tables.js';
import { loadRegistry, applyRegistry } from '../_players.js';

// GET /api/overview: everything the public leaderboard needs, from stored results.
// Never includes edit codes.
// Everyone who watches the leaderboard asks for the same answer every 30 seconds, so the answer is kept at
// Cloudflare for 30 seconds and shared. The database is read once per half minute however many people watch.
// X-Cache says HIT or MISS, which is how to check that it works. If the cache is not available the answer is
// simply built every time, as before.
const FRESH_SECONDS = 30;
export async function onRequestGet(context) {
  const { request, env } = context;
  let cache = null;
  try { cache = typeof caches !== 'undefined' ? caches.default : null; } catch (e) { cache = null; }
  const key = new Request(new URL(request.url).origin + '/api/overview');
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
    const dayRes = await env.DB.prepare('SELECT id, label, date FROM days ORDER BY date DESC, created_at DESC').all();
    const tblRes = await env.DB.prepare('SELECT id, day_id, label, view_code, players, stats, updated_at FROM tables ORDER BY created_at ASC').all();
    const reg = await loadRegistry(env);   // admin decisions about who is who; empty until the registry is enabled
    const tables = [];
    const budget = { left: 12 };   // see statsFor: old statistics are renewed a dozen tables per request
    for (const t of tblRes.results) {
      const stats = await statsFor(env, t, budget);
      tables.push({
        id: t.id, day_id: t.day_id, label: t.label, view_code: t.view_code,
        events: stats.events, hands: stats.hands, winds: stats.winds, progress: stats.progress, mode: stats.mode || 'casual', locked: !!stats.locked, rules: stats.rules || null,
        updatedAt: t.updated_at, players: applyRegistry(reg, summarizePlayers(stats), t.id),
      });
    }
    return json({ days: dayRes.results, tables: tables });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

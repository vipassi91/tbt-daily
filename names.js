import { onRequestGet as playersGet } from './players.js';

// GET /api/names: a light list for the "Find your name" search on the leaderboard and the All players page.
// For every registered player with a public page: id, nickname, number of games, the date of the last game and the modes played.
// It is built from the same facts as /api/players (which Cloudflare keeps for 30 seconds), so the two always agree, and it
// leaves out exactly who that one leaves out: guests, players who have hidden their page, and everything private.
const MODE_ORDER = ['default', 'casual', 'tournament', 'custom', 'mcr4', 'mcr8', 'mcrc'];
export async function onRequestGet(context) {
  const res = await playersGet(context);
  if (!res.ok) return res;                                     // an error is passed on as it is, and never kept
  let data; try { data = await res.json(); } catch (e) { return new Response(JSON.stringify({ error: 'server' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
  const stat = (data.players || []).map(function () { return { games: 0, last: '', modes: {} }; });
  (data.games || []).forEach(function (g) {
    const s = stat[g.p]; if (!s) return;
    s.games++; if (g.date && g.date > s.last) s.last = g.date; s.modes[g.mode] = (s.modes[g.mode] || 0) + 1;
  });
  const players = (data.players || []).map(function (p, i) {
    const modes = Object.keys(stat[i].modes).sort(function (a, b) { const x = MODE_ORDER.indexOf(a), y = MODE_ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    return { id: p.id, name: p.nickname, games: stat[i].games, last: stat[i].last, modes: modes };
  }).sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0; });
  return new Response(JSON.stringify({ players: players, registry: data.registry !== false }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=30', 'X-Content-Type-Options': 'nosniff' } });
}

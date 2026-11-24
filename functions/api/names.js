import { onRequestGet as playersGet } from './players.js';
import { loadRegistry, nameKey } from '../_players.js';

// GET /api/names: a light list for the "Find your name" search on the leaderboard and the All players page.
// For every registered player with a public page: id, nickname, number of games, the date of the last game and the modes played.
// It is built from the same facts as /api/players (which Cloudflare keeps for 30 seconds), so the two always agree, and it
// leaves out exactly who that one leaves out: guests, players who have hidden their page, and everything private.
const MODE_ORDER = ['default', 'casual', 'tournament', 'custom', 'hkc', 'hkf', 'mcr4', 'mcr8', 'mcrc'];
export async function onRequestGet(context) {
  // ?q=...: the players whose real name (or another name already linked to them) matches, so "Yuli" finds "Mymories".
  // Only ids come back, never the real names: the page shows the nickname it already has for that id.
  const q = new URL(context.request.url).searchParams.get('q');
  if (q !== null) return realNameSearch(context.env, q);
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

function fold(s) { return nameKey(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); }
async function realNameSearch(env, q) {
  const k = fold(q);
  const head = { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=60', 'X-Robots-Tag': 'noindex' };
  if (k.length < 3) return new Response(JSON.stringify({ ids: [] }), { headers: head });
  const reg = await loadRegistry(env);
  if (!reg.ready) return new Response(JSON.stringify({ ids: [] }), { headers: head });
  const ids = [];
  const hit = function (name) { const f = fold(name); return !!f && (f.indexOf(k) === 0 || f.indexOf(' ' + k) >= 0); };   // the start of the name or of one of its words
  reg.players.forEach(function (p) { if (!p.hidden && hit(p.fullName) && ids.indexOf(p.id) < 0) ids.push(p.id); });
  reg.names.forEach(function (id, key) { const p = reg.players.get(id); if (p && !p.hidden && hit(key) && ids.indexOf(id) < 0) ids.push(id); });
  return new Response(JSON.stringify({ ids: ids.slice(0, 20) }), { headers: head });
}

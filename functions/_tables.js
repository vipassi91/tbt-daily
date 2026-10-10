import { genCode } from './_auth.js';
import { scoreGame, modeConfig } from './_scoring.js';

const KINDS = ['hu', 'zimo', 'double', 'triple', 'invalid', 'false', 'draw'];
const MODES = ['casual', 'default', 'tournament', 'custom'];
// Bump this whenever buildStats starts storing something new. Stored results with an older
// version are rebuilt from the saved game the next time they are read (see statsFor).
export const STATS_VERSION = 3;

// The rule set a table is played under, in the same terms the scoring engine uses.
function rulesOf(g) {
  const cfg = modeConfig(g || {});
  const start = (g && g.useStart) ? (parseFloat(g.start) || 0) : null;
  return { minPoint: cfg.minPoint, maxStreak: cfg.maxStreak, deadwall: !!cfg.deadwall, seatRotation: !!cfg.seatRotation, bankrupt: !!cfg.bankrupt, start: start };
}

export function validGame(g) {
  if (!g || typeof g !== 'object' || !Array.isArray(g.events) || g.events.length > 400) return false;
  if (g.mode !== undefined && MODES.indexOf(g.mode) < 0) return false;
  if (g.custom !== undefined) {
    // The Custom fields are typed into text boxes, so they arrive as strings and can pass through
    // half-typed values ("" or "1" on the way to "13"). The scoring engine clamps them to sane
    // values, so only a wrong shape is refused here, never a number that is merely out of range.
    if (typeof g.custom !== 'object' || g.custom === null || Array.isArray(g.custom)) return false;
  }
  return g.events.every(function (ev) { return ev && KINDS.indexOf(ev.kind) >= 0; });
}

// Results are computed once, when the host saves, and stored next to the game.
// Reads (leaderboards) then only add up stored numbers instead of replaying every hand.
export function buildStats(game, fallbackPlayers) {
  const g = game || {};
  const raw = (Array.isArray(g.names) && g.names.length === 4) ? g.names : (fallbackPlayers || ['', '', '', '']);
  const events = Array.isArray(g.events) ? g.events : [];
  const s = scoreGame(raw, g);
  const names = s.names;
  const order = names.slice().sort(function (a, b) { return s.aggregates[b].netTotal - s.aggregates[a].netTotal; });
  const rank = {};
  order.forEach(function (n, i) {
    rank[n] = (i > 0 && s.aggregates[order[i - 1]].netTotal === s.aggregates[n].netTotal) ? rank[order[i - 1]] : i + 1;
  });
  const wins = {};
  names.forEach(function (n) { wins[n] = s.rounds.reduce(function (t, r) { return t + (r.handsWon[n] || 0); }, 0); });
  return {
    v: STATS_VERSION, mode: g.mode || 'casual', locked: !!g.lockedAt, rules: rulesOf(g), names: names, rank: rank, wins: wins, aggregates: s.aggregates,
    hands: s.totalHands, events: events.length,
    progress: { wind: s.wind, dealer: s.dealer, done: s.done },
  };
}

function r2(n) { return Math.round((n || 0) * 100) / 100; }

export function summarizePlayers(stats) {
  return stats.names.map(function (n, i) {
    // "Player 1".. are stand-ins for seats the host never named; they must not become a real person on the leaderboard
    return { name: n, seat: i, placeholder: /^Player [1-4]$/.test(n), netTotal: r2(stats.aggregates[n].netTotal), leagueScore: r2(stats.aggregates[n].leagueScore), rank: stats.rank[n], wins: stats.wins[n] };
  });
}

export async function uniqueCode(env, avoid) {
  for (let i = 0; i < 25; i++) {
    const c = genCode(5);
    if (avoid && avoid.indexOf(c) >= 0) continue;
    const row = await env.DB.prepare('SELECT id FROM tables WHERE code=? OR view_code=?').bind(c, c).first();
    if (!row) return c;
  }
  throw new Error('Could not generate a unique code');
}

// A strictly increasing version stamp, so two writes in the same millisecond can never share one.
export function nextStamp(prev) {
  let now = new Date().toISOString();
  if (prev && now <= prev) now = new Date(Date.parse(prev) + 1).toISOString();
  return now;
}

// Stored results for one table row, rebuilt from the saved game when they are missing or were
// written by an older version (e.g. before results carried the mode). The write-back only
// lands if nobody saved the table in the meantime, and it never touches updated_at.
export async function statsFor(env, t) {
  let stats = null;
  try { stats = t.stats ? JSON.parse(t.stats) : null; } catch (e) { stats = null; }
  if (stats && stats.v === STATS_VERSION) return stats;
  const full = (t.rounds !== undefined) ? t : await env.DB.prepare('SELECT rounds FROM tables WHERE id=?').bind(t.id).first();
  let game = {}, players = [];
  try { game = full ? JSON.parse(full.rounds) : {}; } catch (e) { game = {}; }
  try { players = JSON.parse(t.players); } catch (e) { players = []; }
  const fresh = buildStats(game, players);
  try {
    await env.DB.prepare('UPDATE tables SET stats=? WHERE id=? AND updated_at=?').bind(JSON.stringify(fresh), t.id, t.updated_at).run();
  } catch (e) { /* the next read will simply try again */ }
  return fresh;
}

// What a table's players and rules are, in the terms the scoring engine uses. Fields that have no
// effect under the chosen mode are left out, so two games only count as "different" when the
// scoring would actually differ. Missing fields get the same defaults the scoreboard fills in.
export function setupOf(g) {
  g = g || {};
  const mode = g.mode || 'casual';
  const c = g.custom || {};
  const useStart = !!g.useStart;
  const names = Array.isArray(g.names) ? g.names : [];
  return {
    names: [0, 1, 2, 3].map(function (i) { return String(names[i] == null ? '' : names[i]).trim(); }),
    mode: mode,
    custom: mode === 'custom' ? { minPoint: String(c.minPoint == null ? 2 : c.minPoint).trim(), maxStreak: String(c.maxStreak == null ? 4 : c.maxStreak).trim(), deadwall: !!c.deadwall } : null,
    seatRotation: (mode === 'tournament' || mode === 'custom') ? (g.seatRotation === undefined ? true : !!g.seatRotation) : null,
    useStart: useStart,
    start: useStart ? String(g.start == null ? '200' : g.start).trim() : null,
    bankrupt: useStart ? !!g.bankrupt : null,
  };
}
export function sameSetup(a, b) { return JSON.stringify(setupOf(a)) === JSON.stringify(setupOf(b)); }

import { genCode } from './_auth.js';
import { scoreGame } from './_scoring.js';

const KINDS = ['hu', 'zimo', 'double', 'triple', 'invalid', 'false', 'draw'];

export function validGame(g) {
  if (!g || typeof g !== 'object' || !Array.isArray(g.events) || g.events.length > 400) return false;
  return g.events.every(function (ev) { return ev && KINDS.indexOf(ev.kind) >= 0; });
}

// Results are computed once, when the host saves, and stored next to the game.
// Reads (leaderboards) then only add up stored numbers instead of replaying every hand.
export function buildStats(game, fallbackPlayers) {
  const g = game || {};
  const raw = (Array.isArray(g.names) && g.names.length === 4) ? g.names : (fallbackPlayers || ['', '', '', '']);
  const events = Array.isArray(g.events) ? g.events : [];
  const s = scoreGame(raw, events);
  const names = s.names;
  const order = names.slice().sort(function (a, b) { return s.aggregates[b].netTotal - s.aggregates[a].netTotal; });
  const rank = {};
  order.forEach(function (n, i) {
    rank[n] = (i > 0 && s.aggregates[order[i - 1]].netTotal === s.aggregates[n].netTotal) ? rank[order[i - 1]] : i + 1;
  });
  const wins = {};
  names.forEach(function (n) { wins[n] = s.rounds.reduce(function (t, r) { return t + (r.handsWon[n] || 0); }, 0); });
  return {
    v: 1, names: names, rank: rank, wins: wins, aggregates: s.aggregates,
    hands: s.totalHands, events: events.length,
    progress: { wind: s.wind, dealer: s.dealer, done: s.done },
  };
}

function r2(n) { return Math.round((n || 0) * 100) / 100; }

export function summarizePlayers(stats) {
  return stats.names.map(function (n) {
    return { name: n, netTotal: r2(stats.aggregates[n].netTotal), leagueScore: r2(stats.aggregates[n].leagueScore), rank: stats.rank[n], wins: stats.wins[n] };
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

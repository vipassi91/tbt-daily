import { genCode } from './_auth.js';
import { scoreGame, modeConfig, isMcr, isTyped, mcrBaseOf, T } from './_scoring.js';

// Pattern names that were renamed: the old name in a saved hand counts under the new one in the statistics.
const PATTERN_ALIAS = { 'Robbing the Kong': 'Robbing a Kong' };

const KINDS = ['hu', 'zimo', 'double', 'triple', 'invalid', 'false', 'draw'];
const modeOk = function (m) { return T.exists(m); };   // the built-in modes and those added on the Ruleset page
const MCR_KINDS = ['hu', 'zimo', 'invalid', 'false', 'draw'];   // MCR modes: one winner at most, no double or triple
const seatOk = function (v) { return Number.isInteger(v) && v >= 0 && v <= 3; };
// A hand recorded under an MCR mode: seats are 0 to 3, and the typed hand points are a whole number from 0 to 999.
function validMcrEvent(ev) {
  if (!ev || MCR_KINDS.indexOf(ev.kind) < 0) return false;
  const ptsOk = function (w) { return ev.pts && typeof ev.pts === 'object' && Number.isInteger(ev.pts[w]) && ev.pts[w] >= 0 && ev.pts[w] <= 999; };
  if (ev.kind === 'hu') return seatOk(ev.winner) && seatOk(ev.disc) && ev.winner !== ev.disc && ptsOk(ev.winner);
  if (ev.kind === 'zimo') return seatOk(ev.winner) && ptsOk(ev.winner);
  if (ev.kind === 'invalid' || ev.kind === 'false') return seatOk(ev.who);
  return true;
}
// A hand recorded under Riichi: seats 0 to 3; han 0 to 13, fu from the fu list, yakuman 0 to 6 (a win has han or yakuman);
// pao only with a yakuman; the ron callers hold the winner and not the discarder; the riichi calls are seats, none on a chombo.
const RII_FU = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
function seatList(a, max) { return Array.isArray(a) && a.length <= max && a.every(seatOk) && new Set(a).size === a.length; }
function validRiichiEvent(ev) {
  if (!ev || ['hu', 'zimo', 'draw', 'chombo'].indexOf(ev.kind) < 0) return false;
  if (ev.riichi !== undefined && (ev.kind === 'chombo' || !seatList(ev.riichi, 4))) return false;
  if (ev.kind === 'draw') return ev.tenpai === undefined || seatList(ev.tenpai, 4);
  if (ev.kind === 'chombo') return seatOk(ev.who);
  const hf = ev.hf;
  if (!seatOk(ev.winner) || !hf || typeof hf !== 'object') return false;
  if (!Number.isInteger(hf.han) || hf.han < 0 || hf.han > 13 || !Number.isInteger(hf.yk) || hf.yk < 0 || hf.yk > 6 || RII_FU.indexOf(hf.fu) < 0) return false;
  if (!hf.han && !hf.yk) return false;
  if (hf.pao !== undefined && (!hf.yk || !seatOk(hf.pao) || hf.pao === ev.winner)) return false;
  if (ev.kind === 'zimo') return ev.disc === undefined && ev.called === undefined;
  if (!seatOk(ev.disc) || ev.disc === ev.winner) return false;
  if (ev.called !== undefined && (!seatList(ev.called, 3) || ev.called.indexOf(ev.winner) < 0 || ev.called.indexOf(ev.disc) >= 0)) return false;
  return true;
}
// Bump this whenever buildStats starts storing something new. Stored results with an older
// version are rebuilt from the saved game the next time they are read (see statsFor).
export const STATS_VERSION = 7;

// The rule set a table is played under, in the same terms the scoring engine uses.
function rulesOf(g) {
  const cfg = modeConfig(g || {});
  const start = (g && g.useStart) ? (parseFloat(g.start) || 0) : null;
  return { minPoint: cfg.minPoint, maxStreak: cfg.maxStreak, deadwall: !!cfg.deadwall, seatRotation: !!cfg.seatRotation, bankrupt: !!cfg.bankrupt, start: cfg.mcr ? null : start, base: cfg.mcr ? cfg.basePoint : null };
}

// Tiles kept with a won hand (numbers only). A record that does not hold together is dropped, the hand itself is kept.
// the win conditions of the Hong Kong style modes, and (MCR) last tile, last tile of the wall, last discard, replacement after a kong, robbing the kong
const TILE_COND = ['last', 'replacement', 'double', 'robbing', 'lastTile', 'lastTileDraw', 'lastTileClaim', 'outWithReplacement', 'robbingKong'];
function okTileRecord(r) {
  if (!r || typeof r !== 'object' || !Array.isArray(r.h) || !Array.isArray(r.m) || !Array.isArray(r.f)) return false;
  const isT = x => Number.isInteger(x) && x >= 0 && x <= 33;
  if (r.m.length > 4 || r.f.length > 8 || r.h.length + 3 * r.m.length !== 14) return false;
  if (!r.h.every(isT) || !isT(r.w) || r.h.indexOf(r.w) < 0) return false;
  const count = new Array(34).fill(0); r.h.forEach(x => { count[x]++; });
  for (const m of r.m) {
    if (!Array.isArray(m) || m.length !== 3 || ['c', 'p', 'k'].indexOf(m[0]) < 0 || !isT(m[1]) || (m[2] !== 0 && m[2] !== 1)) return false;
    if (m[0] === 'c') { if (m[1] >= 27 || m[1] % 9 > 6) return false; count[m[1]]++; count[m[1] + 1]++; count[m[1] + 2]++; } else count[m[1]] += m[0] === 'k' ? 4 : 3;
  }
  if (count.some(x => x > 4)) return false;
  if (!r.f.every(x => Number.isInteger(x) && x >= 0 && x <= 7) || new Set(r.f).size !== r.f.length) return false;
  if (r.c !== undefined && (!Array.isArray(r.c) || !r.c.every(x => TILE_COND.indexOf(x) >= 0))) return false;
  if (r.c && r.c.indexOf('replacement') >= 0 && r.c.indexOf('double') >= 0) return false;   // only one of the two replacement conditions
  return true;
}
export function cleanTiles(ev) {
  if (!ev || ev.tiles === undefined) return;
  const winners = ev.winner != null ? [ev.winner] : (Array.isArray(ev.winners) ? ev.winners : []), out = {};
  if (ev.tiles && typeof ev.tiles === 'object') for (const k of Object.keys(ev.tiles)) { if (winners.indexOf(+k) < 0 || !okTileRecord(ev.tiles[k])) continue; const r = ev.tiles[k]; out[k] = { h: r.h.slice(), m: r.m.map(x => x.slice()), w: r.w, f: r.f.slice(), c: (r.c || []).slice() }; }
  // the winners of one hand hold tiles from one set: four of each tile in all, the winning tile is one shared tile and counts once, and a flower exists once
  const recs = Object.values(out);
  if (recs.length > 1) {
    const copies = new Array(34).fill(0), seen = new Set(); let same = true;
    recs.forEach(r => { if (r.w !== recs[0].w) same = false; r.h.forEach(t => { copies[t]++; }); r.m.forEach(m => { if (m[0] === 'c') { copies[m[1]]++; copies[m[1] + 1]++; copies[m[1] + 2]++; } else copies[m[1]] += m[0] === 'k' ? 4 : 3; }); r.f.forEach(id => { if (seen.has(id)) same = false; seen.add(id); }); });
    if (same) copies[recs[0].w] -= recs.length - 1;
    if (!same || copies.some(x => x > 4)) { delete ev.tiles; return; }
  }
  if (Object.keys(out).length) ev.tiles = out; else delete ev.tiles;
}
// Move the people to new seats. order[j] = the OLD seat of the person who sits in NEW seat j.
// Every seat number a hand holds (winner, discarder, who, winners, tenpai, and the keys of pts, patterns and tiles) follows its person,
// so each person keeps their own hands; dealers and winds are then worked out again from the new order by the normal replay.
export function isSeatOrder(order) { return Array.isArray(order) && order.length === 4 && [0, 1, 2, 3].every(i => order.filter(o => o === i).length === 1); }
export function permuteGame(game, order) {
  if (!game || !Array.isArray(game.names) || game.names.length !== 4 || !isSeatOrder(order)) return null;
  const inv = []; order.forEach((o, j) => { inv[o] = j; });
  const at = i => inv[i], asc = (a, b) => a - b;
  const keys = obj => { const out = {}; Object.keys(obj).forEach(k => { out[String(at(+k))] = obj[k]; }); return out; };
  const g = JSON.parse(JSON.stringify(game));
  g.names = order.map(o => game.names[o]);
  if (Array.isArray(g.riichiNow)) g.riichiNow = g.riichiNow.map(at).sort(asc);
  g.events = (game.events || []).map(ev => {
    const e = JSON.parse(JSON.stringify(ev));
    ['winner', 'disc', 'who'].forEach(f => { if (Number.isInteger(e[f])) e[f] = at(e[f]); });
    ['winners', 'tenpai', 'riichi', 'called'].forEach(f => { if (Array.isArray(e[f])) e[f] = e[f].map(at).sort(asc); });
    if (e.hf && Number.isInteger(e.hf.pao)) e.hf.pao = at(e.hf.pao);   // Riichi: the player liable for a yakuman
    ['pts', 'patterns', 'tiles'].forEach(f => { if (e[f] && typeof e[f] === 'object') e[f] = keys(e[f]); });
    return e;
  });
  return g;
}
export function validGame(g) {
  if (!g || typeof g !== 'object' || !Array.isArray(g.events) || g.events.length > 400) return false;
  if (g.mode !== undefined && !modeOk(g.mode)) return false;
  if (g.rv !== undefined && !(Number.isInteger(g.rv) && g.rv >= 1)) return false;
  // MCR-Custom's base point is typed into a box: text or a number is fine (the engine keeps it in range), any other shape is not
  if (g.mcrBase !== undefined && g.mcrBase !== null && typeof g.mcrBase !== 'number' && typeof g.mcrBase !== 'string') return false;
  if (g.custom !== undefined) {
    // The Custom fields are typed into text boxes, so they arrive as strings and can pass through
    // half-typed values ("" or "1" on the way to "13"). The scoring engine clamps them to sane
    // values, so only a wrong shape is refused here, never a number that is merely out of range.
    if (typeof g.custom !== 'object' || g.custom === null || Array.isArray(g.custom)) return false;
  }
  if (isTyped(g.mode)) return g.events.every(validMcrEvent);
  if (T.current(g.mode || 'casual').pay === 'riichi') {
    if (g.riichi !== undefined && (typeof g.riichi !== 'object' || g.riichi === null || Array.isArray(g.riichi))) return false;
    if (g.riichiNow !== undefined && !seatList(g.riichiNow, 4)) return false;
    return g.events.every(validRiichiEvent);
  }
  const ok = T.kinds(T.current(g.mode || 'casual'));
  return g.events.every(function (ev) { return ev && ok.indexOf(ev.kind) >= 0; });
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
  // Facts about each player at this table. Only sums and counts are kept (never averages or percentages), so
  // they can be added up across tables. Everything is worked out from the recorded hands, which are never deleted,
  // so a fact added later can be worked out again for every old table.
  //  - windFirsts: wind rounds in which the player finished first (a tie for first counts for each tied player)
  //  - ptsSum: the points of the hands the player won (the hand's points, not the score it was turned into)
  //  - best: the biggest score gained from one hand the player won (null if none)
  //  - zimo / dealIns: self-draws won, and times the player's discard was used for a hu (hu, double or triple)
  //  - zimoLost: hands another player won by self-draw
  //  - penalties: the player's own invalid wins and false wins (never a hand won, lost to a discard or lost to a self-draw)
  //  - low: the worst score the player took from a single hand (null if no hands), best's counterpart over every hand
  //  - dealPts: for each hand the player's discard was used, the average points of its winner(s); summed (a double hu counts once)
  //  - patterns: how many times each pattern (by its name) was counted in hands the player won
  //  - streak: the most hands in a row the player won in this game (a draw or anyone else's win breaks it)
  //  - windHigh / windLow / windPlaceSum: over the wind rounds that are COMPLETE: best and worst net score in one wind round,
  //    and the sum of the places finished in them (a tie shares the place). windsDone, below, is how many wind rounds are complete.
  const windsDone = s.done ? 4 : s.wind;
  const facts = {};
  names.forEach(function (n, idx) {
    let ptsSum = 0, best = null, zimo = 0, dealIns = 0, windFirsts = 0;
    let zimoLost = 0, penalties = 0, low = null, dealPts = 0, run = 0, streak = 0, windHigh = null, windLow = null, windPlaceSum = 0;
    const patterns = {};
    s.rounds.forEach(function (r) {
      if (r.totalHands > 0 && r.places[n] === 1) windFirsts++;
      if (r.totalHands > 0 && r.wind < windsDone) {
        const net = r.totals[n];
        if (windHigh === null || net > windHigh) windHigh = net;
        if (windLow === null || net < windLow) windLow = net;
        windPlaceSum += r.places[n];
      }
      r.hands.forEach(function (h) {
        const ev = events[h.i], d = h.deltas[idx];
        if (low === null || d < low) low = d;
        if (h.winners.includes(idx)) {
          const p = ev && ev.pts ? Number(ev.pts[idx]) : 0;
          if (isFinite(p)) ptsSum += p;
          if (best === null || d > best) best = d;
          if (h.kind === 'zimo') zimo++;
          run++; if (run > streak) streak = run;
          const pk = ev && ev.patterns && ev.patterns[idx];
          if (pk && Array.isArray(pk.counted)) pk.counted.forEach(function (it) {
            const raw = String((it && it.label) || '').trim().slice(0, 80), label = PATTERN_ALIAS[raw] || raw;   // hands saved before the rename carry the old name
            if (label) patterns[label] = (patterns[label] || 0) + 1;
          });
        } else run = 0;
        if (h.kind === 'zimo' && !h.winners.includes(idx)) zimoLost++;
        if ((h.kind === 'invalid' || h.kind === 'false') && ev && ev.who === idx) penalties++;
        if (h.disc === idx && (h.kind === 'hu' || h.kind === 'double' || h.kind === 'triple')) {
          dealIns++;
          const pts = h.winners.map(function (w) { return ev && ev.pts ? Number(ev.pts[w]) : NaN; }).filter(isFinite);
          if (pts.length) dealPts += pts.reduce(function (a, b) { return a + b; }, 0) / pts.length;
        }
      });
    });
    facts[n] = { won: wins[n], ptsSum: Math.round(ptsSum * 100) / 100, best: best, zimo: zimo, dealIns: dealIns, windFirsts: windFirsts,
      zimoLost: zimoLost, penalties: penalties, low: low, dealPts: Math.round(dealPts * 100) / 100, patterns: patterns, streak: streak,
      windHigh: windHigh, windLow: windLow, windPlaceSum: windPlaceSum,
      // the four wind rounds in order: [place, net points, hands, hands won] for a wind round that had hands, null for one that did not
      wr: s.rounds.map(function (r) { return r.totalHands > 0 ? [r.places[n], r2(r.totals[n]), r.totalHands, r.handsWon[n] || 0] : null; }) };
  });
  // Riichi: the game is one hanchan, so the round facts are about the hanchan (the leaderboard and player pages call them hanchan)
  let winds = s.rounds.filter(function (r) { return r.totalHands > 0; }).length, windsDoneOut = windsDone;
  if (modeConfig(g).rs.pay === 'riichi') {
    winds = s.totalHands > 0 ? 1 : 0; windsDoneOut = s.done ? 1 : 0;
    names.forEach(function (n) {
      const a = s.aggregates[n], f = facts[n];
      f.windFirsts = winds && a.place === 1 ? 1 : 0;
      f.windHigh = s.done ? a.netTotal : null; f.windLow = s.done ? a.netTotal : null; f.windPlaceSum = s.done ? a.place : 0;
      f.wr = null;   // no East/South breakdown on the player page: the game links to its recap
    });
  }
  return {
    v: STATS_VERSION, mode: g.mode || 'casual', locked: !!g.lockedAt, rules: rulesOf(g), names: names, rank: rank, wins: wins, aggregates: s.aggregates,
    hands: s.totalHands, events: events.length,
    winds: winds,
    windsDone: windsDoneOut,
    facts: facts,
    progress: { wind: s.wind, dealer: s.dealer, turn: s.turn, done: s.done },
  };
}

function r2(n) { return Math.round((n || 0) * 100) / 100; }

export function summarizePlayers(stats) {
  return stats.names.map(function (n, i) {
    // "Player 1".. are stand-ins for seats the host never named; they must not become a real person on the leaderboard
    return { name: n, seat: i, placeholder: /^Player [1-4]$/.test(n), netTotal: r2(stats.aggregates[n].netTotal), leagueScore: r2(stats.aggregates[n].leagueScore), rank: stats.rank[n], wins: stats.wins[n], windFirsts: stats.facts && stats.facts[n] ? stats.facts[n].windFirsts : undefined };
  });
}

export async function uniqueCode(env, avoid, len) {
  for (let i = 0; i < 25; i++) {
    const c = genCode(len || 5);
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
// `budget` ({ left: n }) lets a page that reads many tables bring old statistics up to date a few at a time: after a
// new version, the first pages show the old numbers for the tables whose turn has not come yet, instead of one
// request doing all the work at once. Without a budget the statistics are always brought up to date.
export async function statsFor(env, t, budget) {
  let stats = null;
  try { stats = t.stats ? JSON.parse(t.stats) : null; } catch (e) { stats = null; }
  if (stats && stats.v === STATS_VERSION) return stats;
  if (budget && stats) { if (budget.left <= 0) return stats; budget.left--; }
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
  const rs = T.current(mode) || T.current('casual');
  const c = g.custom || {};
  const useStart = !!g.useStart;
  const names = Array.isArray(g.names) ? g.names : [];
  return {
    names: [0, 1, 2, 3].map(function (i) { return String(names[i] == null ? '' : names[i]).trim(); }),
    mode: mode,
    custom: rs.hostSets ? { minPoint: String(c.minPoint == null ? 2 : c.minPoint).trim(), maxStreak: String(c.maxStreak == null ? 4 : c.maxStreak).trim(), deadwall: !!c.deadwall } : null,
    // a mode that offers seat rotation lets the host choose; its own default applies until they do
    seatRotation: rs.seat === 'host' ? (g.seatRotation === undefined ? !!rs.seatDefault : !!g.seatRotation) : null,
    mcrBase: rs.baseHost ? mcrBaseOf(g) : null,
    riichi: rs.pay === 'riichi' ? modeConfig(g).riichi : null,   // starting score, length and red fives lock with the rest   // a base typed by the host (MCR-Custom) locks with the rest once a hand is recorded
    useStart: rs.start ? useStart : false,
    start: (useStart && rs.start) ? String(g.start == null ? '200' : g.start).trim() : null,
    bankrupt: (useStart && rs.start) ? !!g.bankrupt : null,
  };
}
// A table plays under the ruleset version that was current when its first hand was recorded (game.rv). Once it has hands
// the stored version is kept whatever the browser sends; deleting every hand releases it.
export function pinRules(current, game) {
  if (!Array.isArray(game.events) || !game.events.length) { delete game.rv; return; }
  if (Array.isArray(current.events) && current.events.length) { game.rv = current.rv || 1; return; }
  const ok = game.rv && T.version(game.mode || 'casual', game.rv) && T.version(game.mode || 'casual', game.rv).v === game.rv;
  if (!ok) game.rv = T.pinVersion(game);
}
export function sameSetup(a, b) { return JSON.stringify(setupOf(a)) === JSON.stringify(setupOf(b)); }

// Makes a table with its two codes: the host code (6 characters, it lets whoever has it enter scores) and the players code (5 characters, read only).
// `createdBy` is the registry id of the host who made it; an admin leaves it out.
// mode is optional (event day tables start with the game mode the session or table was given); anything unknown falls back to casual
export async function createTableRow(env, day, label, rawPlayers, createdBy, mode) {
  const m = modeOk(mode) ? mode : 'casual';
  let players = Array.isArray(rawPlayers) ? rawPlayers.slice(0, 4).map(function (p) { return String(p || '').trim(); }) : [];
  while (players.length < 4) players.push('');
  const code = await uniqueCode(env, undefined, 6);
  const viewCode = await uniqueCode(env, [code], 5);
  let dateText = '';
  try { dateText = new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { dateText = ''; }
  const game = {
    names: players, title: String(label).slice(0, 30), date: dateText,
    useStart: false, start: T.current(m).startDefault || '200', mode: m, seatRotation: T.current(m).seat === 'host' ? !!T.current(m).seatDefault : false, bankrupt: false,
    custom: { minPoint: 2, maxStreak: 4, deadwall: false }, events: [],
  };
  const stats = buildStats(game, players);
  const id = 'tbl-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  if (createdBy) {
    await env.DB.prepare('INSERT INTO tables (id, day_id, code, view_code, label, players, rounds, stats, starting_score, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, day.id, code, viewCode, String(label).trim(), JSON.stringify(stats.names), JSON.stringify(game), JSON.stringify(stats), 240, now, now, createdBy).run();
  } else {
    await env.DB.prepare('INSERT INTO tables (id, day_id, code, view_code, label, players, rounds, stats, starting_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, day.id, code, viewCode, String(label).trim(), JSON.stringify(stats.names), JSON.stringify(game), JSON.stringify(stats), 240, now, now).run();
  }
  return { id: id, code: code, view_code: viewCode };
}

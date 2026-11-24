// Scoring engine, ported directly from the scoreboard's own modeConfig()/
// scoreEvent()/replay() logic, so a table's data means exactly what the
// app the host is typing into says it means, including mode-specific
// rules (Casual/Default/Tournament/Custom), seat rotation, and bankrupt.

// Scoring: the rules engine (assets/js/rules.js) is shared with the scoreboard, so a table's data means exactly what the
// app the host is typing into says it means. The engine reads the table's ruleset (its mode, in the version it started with).
import '../assets/js/rules.js';
export const T = globalThis.TBTRules;
export const MCR_CUSTOM_DEFAULT = 3;
function rs(mode) { return T.current(mode) || T.current('casual'); }
export function isMcr(mode) { return rs(mode).picker === 'mcr' && T.exists(mode); }
export function isHk(mode) { return rs(mode).picker === 'hk' && T.exists(mode); }
export function isTyped(mode) { return T.exists(mode) && rs(mode).entry === 'typed'; }
export function modeConfig(game) { return T.config(game || {}); }
export function mcrBaseOf(game) { return T.config(game || {}).basePoint; }
export function hkPoints(fan, full) { return T.valueOf(T.current(full ? 'hkf' : 'hkc'), fan); }
export function scoreEvent(ev, dealer, cfg) { return T.scoreEvent(ev, dealer, cfg); }
export function replay(events, cfg) { return T.replay(events, cfg); }

export function curveScore(pos) { return { 1: 100, 2: 60, 3: 30, 4: 0 }[pos] ?? 0; }
export function avg(arr) { return arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0; }
export function clip(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Player names must be unique inside a table, because results are keyed by name.
export function uniqueNames(raw) {
  const seen = {};
  return raw.map((n, i) => {
    const base = String(n == null ? '' : n).trim() || ('Player ' + (i + 1));
    let name = base, k = 2;
    while (seen[name.toLowerCase()]) { name = base + ' ' + k; k++; }
    seen[name.toLowerCase()] = true;
    return name;
  });
}

// Turns a table's raw game (names + mode/rules + events) into per-wind
// rounds and League Score aggregates, using the same 35/25/25/15 weighting
// as the original TBT Points Leaderboard. The League Score's net-score
// component is always normalised against a fixed +/-240 range regardless
// of the table's own starting-score setting, so it stays comparable across
// tables that use different modes or starting scores.
export function scoreGame(rawNames, gameLike) {
  const names = uniqueNames(rawNames);
  const cfg = modeConfig(gameLike || {});
  const rp = replay((gameLike && gameLike.events) || [], cfg);

  const rounds = [0,1,2,3].map(w => {
    const wHands = rp.hands.filter(h => h.wind === w && !h.late);
    const totals = {}, handsWon = {};
    names.forEach(n => { totals[n] = 0; handsWon[n] = 0; });
    wHands.forEach(h => {
      names.forEach((n, i) => totals[n] += h.deltas[i]);
      h.winners.forEach(i => { if (names[i]) handsWon[names[i]]++; });
    });
    const nets = { ...totals };
    const sorted = names.slice().sort((a, b) => totals[b] - totals[a]);
    const places = {}, placementCurve = {};
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && totals[sorted[j + 1]] === totals[sorted[i]]) j++;
      const positions = []; for (let k = i; k <= j; k++) positions.push(k + 1);
      const avgCurve = positions.reduce((s, pos) => s + curveScore(pos), 0) / positions.length;
      for (let k = i; k <= j; k++) { places[sorted[k]] = i + 1; placementCurve[sorted[k]] = avgCurve; }
      i = j + 1;
    }
    return { wind: w, hands: wHands, totals, nets, places, placementCurve, handsWon, totalHands: wHands.length };
  });

  const totalHands = rounds.reduce((s, r) => s + r.totalHands, 0);
  const aggregates = {};
  names.forEach((p, idx) => {
    const placementScore = avg(rounds.map(r => r.placementCurve[p] ?? 0));
    const avgNet = avg(rounds.map(r => r.nets[p] ?? 0));
    const netScore = clip(((avgNet + 240) / 480) * 100, 0, 100);
    const totalWon = rounds.reduce((s, r) => s + (r.handsWon[p] || 0), 0);
    const handWinRate = totalHands > 0 ? (totalWon / totalHands) * 100 : 0;
    const netTotal = rounds.reduce((s, r) => s + (r.nets[p] || 0), 0);

    const winValues = [];
    rounds.forEach(r => {
      r.hands.forEach(h => {
        if (h.winners.includes(idx)) {
          const v = h.deltas[idx];
          if (typeof v === 'number' && v > 0) winValues.push(Math.min(v, 144));
        }
      });
    });
    const avgWin = winValues.length ? avg(winValues) : 0;
    const pointValueScore = winValues.length ? clip(((avgWin - 8) / 172) * 100, 0, 100) : 0;
    const leagueScore = 0.35 * placementScore + 0.25 * pointValueScore + 0.25 * handWinRate + 0.15 * netScore;
    aggregates[p] = { placementScore, pointValueScore, handWinRate, netScore, leagueScore, netTotal };
  });

  return { names, rounds, aggregates, totalHands, wind: rp.wind, dealer: rp.dealer, turn: rp.turn, done: rp.done, mode: gameLike && gameLike.mode };
}

// Scoring engine, ported directly from the scoreboard's own modeConfig()/
// scoreEvent()/replay() logic, so a table's data means exactly what the
// app the host is typing into says it means, including mode-specific
// rules (Casual/Default/Tournament/Custom), seat rotation, and bankrupt.

const BASE = [0,2,4,6,8,10,12,16,20,24,28,32,36,40];
function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function huAmt(pts, winner, disc, dealer) {
  const a = BASE[pts] * 2;
  return (winner === dealer || disc === dealer) ? a * 1.5 : a;
}

// Same shape modeConfig() produces client-side, from the table's stored
// mode/custom/seatRotation/bankrupt/useStart/start fields.
export function modeConfig(game) {
  const seat = (game.mode === 'tournament' || game.mode === 'custom') && !!game.seatRotation;
  let cfg;
  if (game.mode === 'default') cfg = { minPoint: 2, maxStreak: 4, deadwall: false, seatRotation: false };
  else if (game.mode === 'tournament') cfg = { minPoint: 2, maxStreak: 1, deadwall: false, seatRotation: seat };
  else if (game.mode === 'custom') {
    const c = game.custom || {};
    cfg = {
      minPoint: Math.min(13, Math.max(1, num(c.minPoint) || 1)),
      maxStreak: Math.max(1, Math.round(num(c.maxStreak)) || 1),
      deadwall: !!c.deadwall, seatRotation: seat,
    };
  } else cfg = { minPoint: 1, maxStreak: 4, deadwall: false, seatRotation: false }; // casual
  cfg.bankrupt = !!(game.useStart && game.bankrupt);
  cfg.startBase = game.useStart ? (num(game.start) || 0) : 0;
  return cfg;
}

// Event shapes the scoreboard's Play tab produces:
// {kind:'hu', winner, disc, pts:{[winner]:n}}
// {kind:'zimo', winner, pts:{[winner]:n}}
// {kind:'double'|'triple', disc, winners:[...], pts:{[w]:n}}
// {kind:'invalid'|'false', who}
// {kind:'draw', tenpai:[...]}
export function scoreEvent(ev, dealer, cfg) {
  const d = [0,0,0,0];
  let dealerWon = false, winners = [];
  const mult = cfg.minPoint * (cfg.deadwall ? 2 : 1);
  if (ev.kind === 'hu') {
    const w = ev.winner, p = ev.pts[w];
    const a = huAmt(p, w, ev.disc, dealer);
    d[w] += a; d[ev.disc] -= a; dealerWon = (w === dealer); winners = [w];
  } else if (ev.kind === 'zimo') {
    const w = ev.winner, p = ev.pts[w];
    for (let i = 0; i < 4; i++) {
      if (i === w) continue;
      const pay = (w === dealer || i === dealer) ? BASE[p] * 1.5 : BASE[p];
      d[i] -= pay; d[w] += pay;
    }
    dealerWon = (w === dealer); winners = [w];
  } else if (ev.kind === 'double' || ev.kind === 'triple') {
    ev.winners.forEach(w2 => {
      const a2 = huAmt(ev.pts[w2], w2, ev.disc, dealer);
      d[w2] += a2; d[ev.disc] -= a2;
      if (w2 === dealer) dealerWon = true;
    });
    winners = ev.winners.slice();
  } else if (ev.kind === 'invalid' || ev.kind === 'false') {
    const pen = ev.kind === 'invalid' ? 12 : 36;
    for (let i = 0; i < 4; i++) d[i] = (i === ev.who) ? -pen : pen / 3;
  } else if (ev.kind === 'draw') {
    const k = ev.tenpai.length;
    if (k >= 1 && k <= 3) {
      for (let i = 0; i < 4; i++) d[i] = (ev.tenpai.includes(i) ? [3,2,1][k-1] : -[1,2,3][k-1]) * mult;
    }
  }
  return { d, dealerWon, winners, disc: ev.disc };
}

// MCR seat rotation table: which seat deals each of the 4 hands in a wind
// round when seat rotation is on. Row 0 (East) always deals in seat order;
// rows 1-3 are the fixed MCR permutations for South/West/North. With seat
// rotation off, every round just reuses row 0 (turn === dealer seat).
const SEAT_ORDER = [[0,1,2,3],[1,0,3,2],[2,3,1,0],[3,2,0,1]];
function seatAt(wind, turn, seatRotation) { return seatRotation ? SEAT_ORDER[wind][turn] : turn; }

export function replay(events, cfg) {
  let wind = 0, turn = 0, dealer = seatAt(0, 0, cfg.seatRotation), streak = 1, done = false;
  let roundTotal = [cfg.startBase, cfg.startBase, cfg.startBase, cfg.startBase];
  const hands = [];
  events.forEach((ev, i) => {
    const r = scoreEvent(ev, dealer, cfg);
    hands.push({ i, kind: ev.kind, wind, dealer, streak, deltas: r.d, winners: r.winners, disc: r.disc, late: done });
    if (done) return;
    let bankrupt = false;
    if (cfg.bankrupt) {
      for (let k = 0; k < 4; k++) roundTotal[k] += r.d[k];
      bankrupt = roundTotal.some(v => v <= 0);
    }
    if (bankrupt) {
      streak = 1; turn = 0; wind++;
      if (wind > 3) { done = true; wind = 3; }
      else { dealer = seatAt(wind, 0, cfg.seatRotation); roundTotal = [cfg.startBase, cfg.startBase, cfg.startBase, cfg.startBase]; }
    } else if (r.dealerWon && streak < cfg.maxStreak) {
      streak++;
    } else {
      streak = 1; turn++;
      if (turn >= 4) {
        turn = 0; wind++;
        if (wind > 3) { done = true; wind = 3; }
        else { dealer = seatAt(wind, 0, cfg.seatRotation); roundTotal = [cfg.startBase, cfg.startBase, cfg.startBase, cfg.startBase]; }
      } else {
        dealer = seatAt(wind, turn, cfg.seatRotation);
      }
    }
  });
  return { hands, wind, dealer, streak, done };
}

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

  return { names, rounds, aggregates, totalHands, wind: rp.wind, dealer: rp.dealer, done: rp.done, mode: gameLike && gameLike.mode };
}

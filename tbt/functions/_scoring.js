// Scoring engine, ported from the scoreboard's own replay()/scoreEvent() logic,
// so a table's data means the same thing here as in the app the host types into.
// Kept ES2015-safe (no ?? and no object spread) because the scoreboard page embeds this file too.

const BASE = [0,2,4,6,8,10,12,16,20,24,28,32,36,40];
function huAmt(pts, winner, disc, dealer) {
  const a = BASE[pts] * 2;
  return (winner === dealer || disc === dealer) ? a * 1.5 : a;
}

// Event shapes, same as the scoreboard's Play tab:
// {kind:'hu', winner, disc, pts:{[winner]:n}}
// {kind:'zimo', winner, pts:{[winner]:n}}
// {kind:'double'|'triple', disc, winners:[...], pts:{[w]:n}}
// {kind:'invalid'|'false', who}
// {kind:'draw', tenpai:[...]}
export function scoreEvent(ev, dealer) {
  const d = [0,0,0,0];
  let dealerWon = false, winners = [];
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
    ev.winners.forEach(function (w2) {
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
      for (let i = 0; i < 4; i++) d[i] = ev.tenpai.indexOf(i) >= 0 ? [3,2,1][k-1] : -[1,2,3][k-1];
    }
  }
  return { d: d, dealerWon: dealerWon, winners: winners, disc: ev.disc };
}

export function replay(events) {
  let wind = 0, dealer = 0, streak = 1, done = false;
  const hands = [];
  events.forEach(function (ev) {
    const r = scoreEvent(ev, dealer);
    hands.push({ kind: ev.kind, wind: wind, dealer: dealer, streak: streak, deltas: r.d, winners: r.winners, disc: r.disc, late: done });
    if (done) return;
    if (r.dealerWon && streak < 4) { streak++; }
    else {
      streak = 1; dealer = (dealer + 1) % 4;
      if (dealer === 0) { wind++; if (wind > 3) { done = true; wind = 3; } }
    }
  });
  return { hands: hands, wind: wind, dealer: dealer, streak: streak, done: done };
}

export function curveScore(pos) { return ({ 1: 100, 2: 60, 3: 30, 4: 0 })[pos] || 0; }
export function avg(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; }
export function clip(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Player names must be unique inside a table, because results are keyed by name.
export function uniqueNames(raw) {
  const seen = {};
  return raw.map(function (n, i) {
    const base = String(n == null ? '' : n).trim() || ('Player ' + (i + 1));
    let name = base, k = 2;
    while (seen[name.toLowerCase()]) { name = base + ' ' + k; k++; }
    seen[name.toLowerCase()] = true;
    return name;
  });
}

// Per-wind rounds and League Score aggregates (35/25/25/15 weighting, same as the
// original TBT Points Leaderboard).
export function scoreGame(rawNames, events) {
  const names = uniqueNames(rawNames);
  const rp = replay(events || []);
  const rounds = [0,1,2,3].map(function (w) {
    const wHands = rp.hands.filter(function (h) { return h.wind === w && !h.late; });
    const totals = {}, handsWon = {};
    names.forEach(function (n) { totals[n] = 0; handsWon[n] = 0; });
    wHands.forEach(function (h) {
      names.forEach(function (n, i) { totals[n] += h.deltas[i]; });
      h.winners.forEach(function (i) { if (names[i]) handsWon[names[i]]++; });
    });
    const nets = Object.assign({}, totals);
    const sorted = names.slice().sort(function (a, b) { return totals[b] - totals[a]; });
    const places = {}, placementCurve = {};
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && totals[sorted[j + 1]] === totals[sorted[i]]) j++;
      const positions = []; for (let k = i; k <= j; k++) positions.push(k + 1);
      const avgCurve = positions.reduce(function (s, pos) { return s + curveScore(pos); }, 0) / positions.length;
      for (let k = i; k <= j; k++) { places[sorted[k]] = i + 1; placementCurve[sorted[k]] = avgCurve; }
      i = j + 1;
    }
    return { wind: w, hands: wHands, totals: totals, nets: nets, places: places, placementCurve: placementCurve, handsWon: handsWon, totalHands: wHands.length };
  });

  const totalHands = rounds.reduce(function (s, r) { return s + r.totalHands; }, 0);
  const aggregates = {};
  names.forEach(function (p, idx) {
    const placementScore = avg(rounds.map(function (r) { return r.placementCurve[p] || 0; }));
    const avgNet = avg(rounds.map(function (r) { return r.nets[p] || 0; }));
    const netScore = clip(((avgNet + 240) / 480) * 100, 0, 100);
    const totalWon = rounds.reduce(function (s, r) { return s + (r.handsWon[p] || 0); }, 0);
    const handWinRate = totalHands > 0 ? (totalWon / totalHands) * 100 : 0;
    const netTotal = rounds.reduce(function (s, r) { return s + (r.nets[p] || 0); }, 0);

    const winValues = [];
    rounds.forEach(function (r) {
      r.hands.forEach(function (h) {
        if (h.winners.indexOf(idx) >= 0) {
          const v = h.deltas[idx];
          if (typeof v === 'number' && v > 0) winValues.push(Math.min(v, 144));
        }
      });
    });
    const avgWin = winValues.length ? avg(winValues) : 0;
    const pointValueScore = winValues.length ? clip(((avgWin - 8) / 172) * 100, 0, 100) : 0;
    const leagueScore = 0.35 * placementScore + 0.25 * pointValueScore + 0.25 * handWinRate + 0.15 * netScore;
    aggregates[p] = { placementScore: placementScore, pointValueScore: pointValueScore, handWinRate: handWinRate, netScore: netScore, leagueScore: leagueScore, netTotal: netTotal };
  });

  return { names: names, rounds: rounds, aggregates: aggregates, totalHands: totalHands, wind: rp.wind, dealer: rp.dealer, done: rp.done };
}

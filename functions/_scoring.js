// Shared scoring engine — same confirmed TBT League Score formula used in
// the original Points Leaderboard: 35% placement curve + 25% point value
// + 25% hand win rate + 15% net score.

export function curveScore(pos) { return { 1: 100, 2: 60, 3: 30, 4: 0 }[pos] ?? 0; }

export function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
export function clip(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// hands: [{winner, winner2, winner3, discarder, deltas:{playerName: number}}]
export function computeRound(players, hands, startingScore) {
  const totals = {}; players.forEach(p => totals[p] = startingScore);
  const handsWon = {}; players.forEach(p => handsWon[p] = 0);
  hands.forEach(h => {
    players.forEach(p => { const d = h.deltas[p]; if (typeof d === 'number') totals[p] += d; });
    [h.winner, h.winner2, h.winner3].forEach(w => { if (w && handsWon.hasOwnProperty(w)) handsWon[w]++; });
  });
  const nets = {}; players.forEach(p => nets[p] = totals[p] - startingScore);

  const sorted = [...players].sort((a, b) => totals[b] - totals[a]);
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
  return { totals, nets, places, placementCurve, handsWon, totalHands: hands.length };
}

export function computeAggregates(players, rounds, totalHands) {
  const agg = {};
  players.forEach(p => {
    const placementScore = avg(rounds.map(r => r.placementCurve[p] ?? 0));
    const avgNet = avg(rounds.map(r => r.nets[p] ?? 0));
    const netScore = clip(((avgNet + 240) / 480) * 100, 0, 100);
    const totalWon = rounds.reduce((s, r) => s + (r.handsWon[p] || 0), 0);
    const handWinRate = totalHands > 0 ? (totalWon / totalHands) * 100 : 0;
    const netTotal = rounds.reduce((s, r) => s + (r.nets[p] || 0), 0);

    const winValues = [];
    rounds.forEach(r => {
      r.hands.forEach(h => {
        if ([h.winner, h.winner2, h.winner3].includes(p)) {
          const v = h.deltas[p];
          if (typeof v === 'number' && v > 0) winValues.push(Math.min(v, 144));
        }
      });
    });
    const avgWin = winValues.length ? avg(winValues) : 0;
    const pointValueScore = winValues.length ? clip(((avgWin - 8) / 172) * 100, 0, 100) : 0;

    const leagueScore = 0.35 * placementScore + 0.25 * pointValueScore + 0.25 * handWinRate + 0.15 * netScore;
    agg[p] = { placementScore, pointValueScore, handWinRate, netScore, leagueScore, netTotal };
  });
  return agg;
}

// Runs the full pipeline from stored table data (rounds keyed by wind name)
// to per-player aggregates, for one table.
export function scoreTable(players, roundsByWind, startingScore) {
  const winds = ['East', 'South', 'West', 'North'];
  const rounds = winds.map(w => {
    const hands = (roundsByWind[w] || []).filter(h => h && h.deltas && Object.keys(h.deltas).length > 0);
    return { wind: w, hands, ...computeRound(players, hands, startingScore) };
  });
  const totalHands = rounds.reduce((s, r) => s + r.totalHands, 0);
  const aggregates = computeAggregates(players, rounds, totalHands);
  return { rounds, aggregates, totalHands };
}

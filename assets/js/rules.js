/* TBT scoring rules: one engine for the scoreboard (browser) and the server (functions/_rules.js is a copy for the server, made by sync_rules.py).
   A ruleset describes one sub-mode (Casual, HK Half Spicy, MCR-8 ...) as settings; the engine turns a hand into score changes.
   The built-in rulesets below are version 1 of every mode. The admin's Ruleset page saves later versions in the database;
   a table keeps the version that was current when its first hand was recorded, so its scores never change afterwards.
   Plain script on purpose (no import/export): the scoreboard loads it with a <script> tag, the server imports it for its side effect. */
(function (root) {
  'use strict';
  var TBT_TABLE = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40];
  var HK_TABLE = [1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384];
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---- what every ruleset holds (a saved one may leave things out: they come from here) ----
  var DEFAULTS = {
    id: '', fam: 'tbt', name: '', short: '', order: 0, hidden: false, events: true, help: '',
    unit: 'points',          // 'points' | 'fan': what a hand is counted in
    entry: 'grid',           // 'grid': a chip per value from the minimum to the limit | 'typed': the value is typed
    picker: 'tbt',           // which Pick Patterns and Pick Tiles belong to it: 'tbt' | 'hk' | 'mcr' | 'none' (no patterns: any complete hand wins)
    pay: 'table',            // 'table': table[value] | 'double': 2 to the power of the value | 'same': the value itself | 'flat': every win is worth flat
    flat: 1,                 // what every win is worth when pay is 'flat'
    table: TBT_TABLE.slice(),
    limit: 13,               // the value counts up to this (0 = no limit)
    min: 1,                  // the minimum to win
    flowersMin: false,       // flower fan count toward the minimum (HK)
    base: 0,                 // a base every loser pays on every win (MCR)
    baseHost: false,         // the host types the base for the table, and the minimum follows it (MCR-Custom)
    minIsBase: false,        // the minimum is the base (MCR)
    hu: { disc: 2, others: 0 },  // Hu: the discarder pays value x disc, each of the other two pays value x others (both plus the base)
    zimo: 1,                 // Zi Mo: each of the other three pays value x zimo (plus the base)
    dealerMult: 1.5,         // a payment the dealer makes or receives is multiplied by this
    multi: true,             // Double and Triple Hu
    streak: 4,               // hands in a row the dealer may keep (0 = no limit)
    stayDraw: false,         // the dealer stays after a draw
    stayPen: false,          // the dealer stays after an invalid or false win
    pen: { invalid: { kind: 'split', amount: 12 }, false: { kind: 'split', amount: 36 } },   // kind: 'split' | 'each' | 'limit'
    draw: { kind: 'tenpai', t: [3, 2, 1], byMin: true },   // kind: 'zero' | 'tenpai'; t: what each player in tenpai gets with 1, 2, 3 in tenpai
    deadwall: false,         // non-replenishing deadwall: the tenpai payout doubles
    hostSets: false,         // the host sets the minimum, the streak and the deadwall per table (TBT Custom)
    seat: 'off',             // seat rotation: 'off' | 'host' (the host chooses)
    seatDefault: false,
    start: true,             // a starting score (and Bankrupt) is offered
    startDefault: '200',
    // pattern settings of this sub-mode: null = the built-in list. { set: {<id>: {pts, max, off, win, alone}}, custom: [{id, name, pts, max, grp, repl, excl, win, alone}] }
    patterns: null,
    stack: 10                // TBT patterns: they stop adding up once the running total reaches this (0 = no cutoff)
  };
  function R(o) { var r = clone(DEFAULTS); Object.keys(o).forEach(function (k) { r[k] = clone(o[k]); }); if (!r.short) r.short = r.name; return r; }
  var MCR = { fam: 'mcr', unit: 'points', entry: 'typed', picker: 'mcr', pay: 'same', limit: 0, minIsBase: true, hu: { disc: 1, others: 0 }, zimo: 1, dealerMult: 1, multi: false, streak: 1,
    pen: { invalid: { kind: 'split', amount: 24 }, false: { kind: 'split', amount: 48 } }, draw: { kind: 'zero', t: [3, 2, 1], byMin: true }, seat: 'host', seatDefault: false, start: false };
  var HK = { fam: 'hk', unit: 'fan', entry: 'typed', picker: 'hk', pay: 'table', table: HK_TABLE.slice(), limit: 13, min: 3, flowersMin: true, hu: { disc: 2, others: 0 }, zimo: 1, dealerMult: 1, multi: false, streak: 0, stayDraw: true, stayPen: true,
    pen: { invalid: { kind: 'limit', amount: 0 }, false: { kind: 'limit', amount: 0 } }, draw: { kind: 'zero', t: [3, 2, 1], byMin: true }, seat: 'off', start: false };
  function ext(a, b) { var o = clone(a); Object.keys(b).forEach(function (k) { o[k] = b[k]; }); return o; }
  // Families: the three built in, then the ones made on the Ruleset page (saved as rows with id '@' + family id).
  // rank: the family a new family's tables are ranked with on the leaderboard ('own' = a group of its own).
  var BUILTIN_FAMILIES = [
    { id: 'tbt', name: 'TBT', col: '#2D6A4F', rank: 'own', order: 1 }, { id: 'hk', name: 'HK Classic', col: '#B72323', rank: 'own', order: 2 }, { id: 'mcr', name: 'MCR', col: '#2F5D9E', rank: 'own', order: 3 },
    { id: 'riichi', name: 'Riichi', col: '#7A4B8C', rank: 'own', order: 4 }
  ];
  var FAMILIES = clone(BUILTIN_FAMILIES);   // the same array is kept (and refilled) so pages holding it see new families
  var FAM_COLOURS = ['#2D6A4F', '#B72323', '#2F5D9E', '#7A5C14', '#7A4B8C', '#1F6F78', '#B4532A'];
  function cleanFamily(d) {
    var f = d || {}, e = [], name = String(f.name || '').trim().slice(0, 24);
    if (!name) e.push('The family needs a name');
    var col = /^#[0-9A-Fa-f]{6}$/.test(f.col) ? f.col.toUpperCase() : FAM_COLOURS[3];
    var rank = ['own', 'tbt', 'hk', 'mcr'].indexOf(f.rank) >= 0 ? f.rank : 'own';
    var order = Math.round(Math.min(999, Math.max(4, parseFloat(f.order) || 10)));
    return { family: { name: name, col: col, rank: rank, order: order, hidden: !!f.hidden }, errors: e };
  }
  // Riichi (WRC 2025): scored by its own engine below (pay 'riichi'); the table picks the starting score, the length and red fives
  var RIICHI = { fam: 'riichi', unit: 'han', entry: 'hanfu', picker: 'riichi', pay: 'riichi', table: [], limit: 0, min: 1, hu: { disc: 1, others: 0 }, zimo: 1, dealerMult: 1, multi: false, streak: 0, stayDraw: true,
    draw: { kind: 'tenpai', t: [3, 2, 1], byMin: false }, seat: 'off', start: false };
  var BUILTIN = [
    R({ id: 'casual', name: 'Casual', order: 1, min: 1, streak: 4 }),
    R({ id: 'default', name: 'Default', order: 2, min: 2, streak: 4 }),
    R({ id: 'tournament', name: 'Tournament', order: 3, min: 2, streak: 1, seat: 'host', seatDefault: true, startDefault: '240' }),
    R({ id: 'custom', name: 'Custom', order: 4, min: 2, streak: 4, hostSets: true, seat: 'host', seatDefault: true }),
    R(ext(HK, { id: 'hkc', name: 'Half Spicy', short: 'HK Half Spicy', order: 1 })),
    R(ext(HK, { id: 'hkf', name: 'Full Spicy', short: 'HK Full Spicy', order: 2, pay: 'double' })),
    R(ext(MCR, { id: 'mcr4', name: 'MCR-4', order: 1, base: 4, min: 4 })),
    R(ext(MCR, { id: 'mcr8', name: 'MCR-8', order: 2, base: 8, min: 8 })),
    R(ext(MCR, { id: 'mcrc', name: 'MCR-Custom', order: 3, base: 3, min: 3, baseHost: true })),
    R(ext(RIICHI, { id: 'wrc', name: 'WRC 2025', short: 'Riichi WRC 2025', order: 1 }))
  ];
  BUILTIN.forEach(function (r) { r.v = 1; });

  // ---- the registry: every version of every mode, built in and saved ----
  // saved: [{id, v, data}] from the database (data: the full ruleset). Later versions override; a mode only in the database is new.
  function registry(saved) {
    var by = {};
    BUILTIN.forEach(function (r) { by[r.id] = [r]; });
    var fams = {};
    (saved || []).slice().sort(function (a, b) { return a.v - b.v; }).forEach(function (s) {
      if (!s || !s.id || !s.data) return;
      if (s.id.charAt(0) === '@') { var F = cleanFamily(s.data).family; F.id = s.id.slice(1); F.v = s.v; fams[F.id] = F; return; }
      var r = R(s.data); r.id = s.id; r.v = s.v; (by[s.id] = by[s.id] || []).push(r);
    });
    Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return a.v - b.v; }); });
    var families = clone(BUILTIN_FAMILIES).concat(Object.keys(fams).map(function (k) { return fams[k]; }).filter(function (F) { return BUILTIN_FAMILIES.every(function (B) { return B.id !== F.id; }); })
      .sort(function (a, b) { return a.order - b.order || a.name.localeCompare(b.name); }));
    return { by: by, families: families };
  }
  var REG = registry([]);
  function setSaved(saved) { REG = registry(saved); FAMILIES.length = 0; REG.families.forEach(function (F) { FAMILIES.push(F); }); return REG; }
  function family(id) { for (var i = 0; i < FAMILIES.length; i++) if (FAMILIES[i].id === id) return FAMILIES[i]; return null; }
  function current(id) { var l = REG.by[id]; return l ? l[l.length - 1] : null; }
  function version(id, v) { var l = REG.by[id]; if (!l) return null; if (v) for (var i = 0; i < l.length; i++) if (l[i].v === v) return l[i]; return l[l.length - 1]; }
  // the modes in picker order: families in their order, sub-modes by their order
  function list(all) {
    var out = [];
    FAMILIES.forEach(function (f) {
      Object.keys(REG.by).map(current).filter(function (r) { return r.fam === f.id && (all || !r.hidden); })
        .sort(function (a, b) { return a.order - b.order || a.name.localeCompare(b.name); }).forEach(function (r) { out.push(r); });
    });
    return out;
  }
  function exists(id) { return !!REG.by[id]; }
  // the ruleset a game is played under: its own version once pinned (rv), otherwise the current one; an unknown mode plays as Casual
  // A game with hands but no version was played before rulesets had versions: it stays on version 1, the rules it was played under.
  function rulesOf(game) {
    var g = game || {}, has = Array.isArray(g.events) && g.events.length > 0;
    if (!REG.by[g.mode]) return current('casual');
    return version(g.mode, g.rv || (has ? 1 : 0));
  }
  // the version a table is pinned to when its first hand is recorded
  function pinVersion(game) { var r = current((game || {}).mode); return r ? r.v : 1; }

  // ---- from a ruleset and a table's own options to the settings the engine uses ----
  function config(game, rs) {
    var g = game || {}; rs = rs || rulesOf(g);
    var cfg = { rs: rs, id: rs.id, fam: rs.fam, unit: rs.unit, picker: rs.picker, typed: rs.entry === 'typed' };
    var base = rs.base;
    if (rs.baseHost) { var n = parseFloat(g.mcrBase); base = isNaN(n) ? rs.base : Math.min(99, Math.max(0, Math.round(n))); }
    cfg.basePoint = base;
    cfg.minPoint = rs.minIsBase ? base : rs.min;
    cfg.maxStreak = rs.streak > 0 ? rs.streak : Infinity;
    cfg.deadwall = !!rs.deadwall;
    if (rs.hostSets) {
      var c = g.custom || {};
      cfg.minPoint = Math.min(rs.limit || 13, Math.max(1, num(c.minPoint) || 1));
      cfg.maxStreak = Math.max(1, Math.round(num(c.maxStreak)) || 1);
      cfg.deadwall = !!c.deadwall;
    }
    cfg.limit = rs.limit > 0 ? rs.limit : 0;
    cfg.seatRotation = rs.seat === 'host' && !!g.seatRotation;
    cfg.bankrupt = !!(rs.start && g.useStart && g.bankrupt);
    cfg.startBase = (rs.start && g.useStart) ? (num(g.start) || 0) : 0;
    cfg.value = function (n) { return valueOf(rs, n); };
    // names the scoreboard already uses
    cfg.mcr = cfg.typed; cfg.hk = rs.picker === 'hk'; cfg.hkFull = rs.pay === 'double';
    if (rs.pay === 'riichi') { var ro = g.riichi || {}; cfg.riichi = { start: +ro.start === 25000 ? 25000 : 30000, len: ro.len === 'east' ? 'east' : 'south', aka: !!ro.aka }; cfg.maxStreak = Infinity; }
    return cfg;
  }
  // what a hand of n (points or fan) is worth
  function valueOf(rs, n) {
    var x = Math.max(0, Math.round(num(n)));
    if (rs.limit > 0) x = Math.min(x, rs.limit);
    if (rs.pay === 'double') return Math.pow(2, x);
    if (rs.pay === 'same') return x;
    if (rs.pay === 'flat') return num(rs.flat);
    var t = rs.table || [];
    return t.length ? num(t[Math.min(x, t.length - 1)]) : x;
  }

  // ---- one hand: score changes for the four seats, and whether the dealer keeps the deal ----
  // Hands: {kind:'hu', winner, disc, pts:{w:n}} {kind:'zimo', winner, pts} {kind:'double'|'triple', disc, winners, pts} {kind:'invalid'|'false', who} {kind:'draw', tenpai:[...]}
  function scoreEvent(ev, dealer, cfg) {
    var rs = cfg.rs, d = [0, 0, 0, 0], winners = [], stay = false, B = cfg.basePoint || 0;
    function mult(a, b) { return (rs.dealerMult !== 1 && (a === dealer || b === dealer)) ? rs.dealerMult : 1; }
    function pay(from, to, amount) { if (!amount) return; var a = amount * mult(from, to); d[from] -= a; d[to] += a; }
    function hu(w, disc) {
      var v = valueOf(rs, ev.pts && ev.pts[w]);
      pay(disc, w, v * rs.hu.disc + B);
      for (var i = 0; i < 4; i++) if (i !== w && i !== disc) pay(i, w, v * rs.hu.others + B);
      winners.push(w); if (w === dealer) stay = true;
    }
    if (ev.kind === 'hu') hu(ev.winner, ev.disc);
    else if (ev.kind === 'zimo') {
      var w = ev.winner, v = valueOf(rs, ev.pts && ev.pts[w]);
      for (var i = 0; i < 4; i++) if (i !== w) pay(i, w, v * rs.zimo + B);
      winners.push(w); if (w === dealer) stay = true;
    } else if (ev.kind === 'double' || ev.kind === 'triple') {
      (ev.winners || []).forEach(function (w2) { hu(w2, ev.disc); });
    } else if (ev.kind === 'invalid' || ev.kind === 'false') {
      var p = rs.pen[ev.kind] || { kind: 'split', amount: 0 };
      var each = p.kind === 'limit' ? valueOf(rs, rs.limit > 0 ? rs.limit : 0) : p.kind === 'each' ? num(p.amount) : num(p.amount) / 3;
      for (var k = 0; k < 4; k++) d[k] = k === ev.who ? -3 * each : each;
      if (p.kind === 'split') d[ev.who] = -num(p.amount);
      if (rs.stayPen) stay = true;
    } else if (ev.kind === 'draw') {
      var n = (ev.tenpai || []).length;
      if (rs.draw.kind === 'tenpai' && n >= 1 && n <= 3) {
        var unit = (rs.draw.byMin ? cfg.minPoint : 1) * (cfg.deadwall ? 2 : 1), get = num(rs.draw.t[n - 1]) * unit, give = get * n / (4 - n);
        for (var j = 0; j < 4; j++) d[j] = ev.tenpai.indexOf(j) >= 0 ? get : -give;
      }
      if (rs.stayDraw) stay = true;
    }
    return { d: d, dealerWon: stay, winners: winners, disc: ev.disc };
  }

  // ---- Riichi, WRC 2025 ----
  // Hands: {kind:'hu', winner, disc, hf:{han, fu, yk, pao}, called:[...]} (ron) {kind:'zimo', winner, hf} (tsumo) {kind:'draw', tenpai:[...]} {kind:'chombo', who}
  // and riichi: [seats] on every hand but a chombo: who declared riichi in it (1.000 each to the table).
  // Ron: one winner only (head bump). Kiriage mangan, counted yakuman at 13 han, honba 300, noten payment 3.000, no abortive draws,
  // no agari-yame and no bust. The dealer stays after a win or when in tenpai at a draw. A chombo re-deals the hand: the riichi sticks of
  // that hand go back, the dealer and honba stay, the points don't change; it costs 30 on the hanchan score.
  var RII_UMA = [15, 5, -5, -15], RII_RETURN = 30000;
  function riiUp(x) { return Math.ceil(x / 100) * 100; }
  function riiBasic(han, fu, yk) {
    if (yk) return 8000 * yk;
    if (han >= 13) return 8000;
    if (han >= 11) return 6000;
    if (han >= 8) return 4000;
    if (han >= 6) return 3000;
    if (han >= 5) return 2000;
    var b = fu * Math.pow(2, han + 2);
    return b >= 1920 ? 2000 : b;
  }
  function riiLimit(han, fu, yk) {
    if (yk) return yk > 1 ? yk + '× yakuman' : 'Yakuman';
    if (han >= 13) return 'Counted yakuman';
    if (han >= 11) return 'Sanbaiman'; if (han >= 8) return 'Baiman'; if (han >= 6) return 'Haneman';
    if (han >= 1 && riiBasic(han, fu, 0) === 2000) return 'Mangan';
    return '';
  }
  // what one win moves, before the riichi sticks
  function riiWin(ev, dealer, honba) {
    var d = [0, 0, 0, 0], w = ev.winner, hf = ev.hf || {}, isD = w === dealer, tsumo = ev.kind === 'zimo', yk = Math.max(0, Math.round(num(hf.yk)));
    function pay(from, amt) { if (from === w || from == null || from < 0 || !amt) return; d[from] -= amt; d[w] += amt; }
    function tsumoAll(b, each) { for (var i = 0; i < 4; i++) if (i !== w) pay(i, (isD || i === dealer ? riiUp(b * 2) : riiUp(b)) + each); }
    var pao = yk >= 1 && hf.pao != null && hf.pao >= 0 && hf.pao !== w ? hf.pao : null;
    if (pao != null) {
      // WRC 11.2: the liable player pays the fed yakuman in full on a tsumo, half of it on a ron (the discarder pays the other half); other yakuman are paid as usual
      var fed = riiUp(8000 * (isD ? 6 : 4)), rest = yk - 1;
      if (tsumo) { pay(pao, fed); if (rest > 0) tsumoAll(8000 * rest, honba * 100); else pay(pao, honba * 300); }
      else {
        if (pao === ev.disc) pay(ev.disc, fed); else { pay(pao, fed / 2); pay(ev.disc, fed / 2); }
        if (rest > 0) pay(ev.disc, riiUp(8000 * rest * (isD ? 6 : 4)));
        pay(ev.disc, honba * 300);
      }
    } else {
      var b = riiBasic(num(hf.han), num(hf.fu), yk);
      if (tsumo) tsumoAll(b, honba * 100); else pay(ev.disc, riiUp(b * (isD ? 6 : 4)) + honba * 300);
    }
    return d;
  }
  function riiDraw(tenpai) {
    var t = tenpai || [], n = t.length, d = [0, 0, 0, 0];
    if (n === 0 || n === 4) return d;
    for (var i = 0; i < 4; i++) d[i] = t.indexOf(i) >= 0 ? 3000 / n : -3000 / (4 - n);
    return d;
  }
  function riiSeats(a) { var o = []; (Array.isArray(a) ? a : []).forEach(function (x) { x = +x; if (x >= 0 && x < 4 && o.indexOf(x) < 0) o.push(x); }); return o.sort(); }
  function riichiReplay(events, cfg) {
    var R = cfg.riichi || { start: 30000, len: 'south' }, total = R.len === 'east' ? 4 : 8;
    var round = 0, honba = 0, dep = 0, done = false, hands = [], chombo = [0, 0, 0, 0];
    (events || []).forEach(function (ev, i) {
      var dealer = round % 4, d = [0, 0, 0, 0], winners = [], h0 = honba, dep0 = dep, r0 = round, sticks = 0, late = done;
      var rii = ev.kind === 'chombo' ? [] : riiSeats(ev.riichi);
      if (!late) {
        rii.forEach(function (p) { d[p] -= 1000; }); dep += rii.length;
        var stay = false, next = false;
        if (ev.kind === 'hu' || ev.kind === 'zimo') {
          var wd = riiWin(ev, dealer, honba); for (var k = 0; k < 4; k++) d[k] += wd[k];
          d[ev.winner] += dep * 1000; sticks = dep; dep = 0; winners.push(ev.winner);
          stay = ev.winner === dealer; honba = stay ? honba + 1 : 0; next = !stay;
        } else if (ev.kind === 'draw') {
          var dd = riiDraw(riiSeats(ev.tenpai)); for (var j = 0; j < 4; j++) d[j] += dd[j];
          stay = riiSeats(ev.tenpai).indexOf(dealer) >= 0; honba++; next = !stay;
        } else if (ev.kind === 'chombo') { if (ev.who >= 0 && ev.who < 4) chombo[ev.who]++; }
        if (next) { round++; if (round >= total) { round = total - 1; done = true; } }
      }
      hands.push({ i: i, kind: ev.kind, wind: r0 < 4 ? 0 : 1, round: r0, dealer: dealer, streak: h0, honba: h0, deposits: dep0, sticks: sticks, riichi: rii,
        deltas: late ? [0, 0, 0, 0] : d, winners: winners, disc: ev.disc, late: late, patterns: ev.patterns });
    });
    return { hands: hands, wind: round < 4 ? 0 : 1, round: round, dealer: round % 4, streak: honba, honba: honba, deposits: dep, done: done, turn: round % 4, chombo: chombo, total: total };
  }
  // the hanchan score of each player from the final points: (points - 30.000) / 1.000 + uma (split when level) + oka (25.000 start) - 30 per chombo
  function riichiFinal(pts, chombo, start) {
    var pl = pts.map(function (p) { return pts.filter(function (q) { return q > p; }).length; }), oka = start === 25000 ? (RII_RETURN - 25000) * 4 / 1000 : 0;
    return pts.map(function (p, i) {
      var k = pl[i], same = pl.filter(function (x) { return x === k; }).length, uma = RII_UMA.slice(k, k + same).reduce(function (a, b) { return a + b; }, 0) / same;
      var ok = k === 0 ? oka / same : 0, base = (p - RII_RETURN) / 1000, ch = -30 * ((chombo || [])[i] || 0);
      return { i: i, place: k, base: base, uma: uma, oka: ok, chombo: ch, total: Math.round((base + uma + ok + ch) * 10) / 10 };
    });
  }

  // MCR seat rotation: which seat deals each of the 4 hands in a wind round (row 0 East; rows 1-3 the fixed MCR permutations)
  var SEAT_ORDER = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 1, 0], [3, 2, 0, 1]];
  function seatAt(wind, turn, seatRotation) { return seatRotation ? SEAT_ORDER[wind][turn] : turn; }
  // every hand in order: dealer, streak, wind round and each hand's score changes. A wind round ends once 4 dealer turns have passed.
  function replay(events, cfg) {
    if (cfg.rs && cfg.rs.pay === 'riichi') return riichiReplay(events, cfg);
    var wind = 0, turn = 0, dealer = seatAt(0, 0, cfg.seatRotation), streak = 1, done = false, hands = [];
    var roundTotal = [cfg.startBase, cfg.startBase, cfg.startBase, cfg.startBase];
    (events || []).forEach(function (ev, i) {
      var r = scoreEvent(ev, dealer, cfg);
      hands.push({ i: i, kind: ev.kind, wind: wind, dealer: dealer, streak: streak, deltas: r.d, winners: r.winners, disc: r.disc, late: done, patterns: ev.patterns });
      if (done) return;
      var bankrupt = false;
      if (cfg.bankrupt) { for (var k = 0; k < 4; k++) roundTotal[k] += r.d[k]; bankrupt = roundTotal.some(function (v) { return v <= 0; }); }
      if (bankrupt) {
        streak = 1; turn = 0; wind++;
        if (wind > 3) { done = true; wind = 3; } else { dealer = seatAt(wind, 0, cfg.seatRotation); roundTotal = [cfg.startBase, cfg.startBase, cfg.startBase, cfg.startBase]; }
      } else if (r.dealerWon && streak < cfg.maxStreak) streak++;
      else {
        streak = 1; turn++;
        if (turn >= 4) {
          turn = 0; wind++;
          if (wind > 3) { done = true; wind = 3; } else { dealer = seatAt(wind, 0, cfg.seatRotation); roundTotal = [cfg.startBase, cfg.startBase, cfg.startBase, cfg.startBase]; }
        } else dealer = seatAt(wind, turn, cfg.seatRotation);
      }
    });
    return { hands: hands, wind: wind, dealer: dealer, streak: streak, done: done, turn: turn };
  }
  function kinds(rs) { if (rs.pay === 'riichi') return ['hu', 'zimo', 'draw', 'chombo']; return rs.multi ? ['hu', 'zimo', 'double', 'triple', 'invalid', 'false', 'draw'] : ['hu', 'zimo', 'invalid', 'false', 'draw']; }

  // ---- a saved ruleset, checked: wrong shapes are refused, numbers kept in range ----
  function cleanPatterns(P, e) {
    if (!P || typeof P !== 'object') return null;
    function num(v, lo, hi) { var x = parseFloat(v); return isNaN(x) ? null : Math.min(hi, Math.max(lo, x)); }
    function win(w) { return ['zimo', 'hu', 'both'].indexOf(w) >= 0 ? w : null; }
    function ids(a) { return (Array.isArray(a) ? a : []).slice(0, 40).map(function (x) { return String(x).slice(0, 80); }); }
    var set = {}, custom = [], names = {};
    Object.keys(P.set || {}).slice(0, 400).forEach(function (id) {
      var o = P.set[id] || {}, r = {}, v;
      if ((v = num(o.pts, 0, 1000000)) !== null) r.pts = v;
      if ((v = num(o.max, 1, 20)) !== null) r.max = Math.round(v);
      if (o.off) r.off = true;
      if (win(o.win)) r.win = o.win;
      if (o.alone === false) r.alone = false;   // a TBT Master or Legendary pattern that stacks like the others
      if (Object.keys(r).length) set[String(id).slice(0, 80)] = r;
    });
    (Array.isArray(P.custom) ? P.custom : []).slice(0, 60).forEach(function (c, i) {
      var name = String(c && c.name || '').trim().slice(0, 40);
      if (!name) { e.push('A custom pattern has no name'); return; }
      if (names[name.toLowerCase()]) { e.push('Two custom patterns are both called ' + name); return; }
      names[name.toLowerCase()] = 1;
      custom.push({ id: /^c:/.test(c.id) ? String(c.id).slice(0, 40) : 'c:' + (i + 1) + ':' + name.replace(/[^A-Za-z0-9]+/g, ''),
        name: name, pts: num(c.pts, 0, 1000000) || 0, max: Math.round(num(c.max, 1, 20) || 1), grp: c.grp == null ? '' : String(c.grp).slice(0, 20),
        repl: ids(c.repl), excl: ids(c.excl), win: win(c.win) || 'both', from: c.from ? String(c.from).slice(0, 80) : '', alone: c.alone !== false });
    });
    // TBT: the rules between patterns as changed on the Ruleset page. repl / only: a pattern's full list (only false = no short list); exAdd / exDel: pairs that do or no longer go together
    var R0 = P.rel || {}, rel = { repl: {}, only: {}, exAdd: [], exDel: [] };
    Object.keys(R0.repl || {}).slice(0, 200).forEach(function (id) { rel.repl[String(id).slice(0, 80)] = ids(R0.repl[id]); });
    Object.keys(R0.only || {}).slice(0, 200).forEach(function (id) { rel.only[String(id).slice(0, 80)] = R0.only[id] === false ? false : ids(R0.only[id]); });
    function pairs(a) { return (Array.isArray(a) ? a : []).slice(0, 400).filter(function (x) { return Array.isArray(x) && x.length === 2 && x[0] !== x[1]; }).map(function (x) { return [String(x[0]).slice(0, 80), String(x[1]).slice(0, 80)]; }); }
    rel.exAdd = pairs(R0.exAdd); rel.exDel = pairs(R0.exDel);
    var hasRel = Object.keys(rel.repl).length || Object.keys(rel.only).length || rel.exAdd.length || rel.exDel.length;
    if (!Object.keys(set).length && !custom.length && !hasRel) return null;
    var out = { set: set, custom: custom }; if (hasRel) out.rel = rel;
    return out;
  }

  function clean(data) {
    var r = R(data || {}), e = [];
    function n(v, lo, hi, d) { var x = parseFloat(v); if (isNaN(x)) return d; return Math.min(hi, Math.max(lo, x)); }
    r.name = String(r.name || '').trim().slice(0, 30); if (!r.name) e.push('Name is empty');
    r.short = String(r.short || r.name).trim().slice(0, 30);
    r.help = String(r.help || '').slice(0, 1500);
    if (!family(r.fam)) e.push('Unknown family');
    if (['points', 'fan', 'han'].indexOf(r.unit) < 0) r.unit = 'points';
    if (['grid', 'typed', 'hanfu'].indexOf(r.entry) < 0) r.entry = 'grid';
    if (['tbt', 'hk', 'mcr', 'none', 'riichi'].indexOf(r.picker) < 0) r.picker = ['tbt', 'hk', 'mcr', 'riichi'].indexOf(r.fam) >= 0 ? r.fam : 'none';
    if (['table', 'double', 'same', 'flat', 'riichi'].indexOf(r.pay) < 0) r.pay = 'table';
    if (r.fam === 'riichi') { r.unit = 'han'; r.entry = 'hanfu'; r.picker = 'riichi'; r.pay = 'riichi'; r.limit = 0; r.start = false; r.seat = 'off'; r.multi = false; }   // riichi scores by its own engine
    r.flat = n(r.flat, 0, 1000000, 1); r.stack = Math.round(n(r.stack, 0, 99, 10));
    r.limit = Math.round(n(r.limit, 0, 99, 13));
    r.table = (Array.isArray(r.table) ? r.table : []).slice(0, 100).map(function (x) { return n(x, 0, 1000000, 0); });
    if (r.pay === 'table' && r.fam !== 'riichi' && r.table.length < (r.limit || 13) + 1) e.push('The payout table needs a value up to the limit');
    r.min = Math.round(n(r.min, 0, 99, 1)); r.base = n(r.base, 0, 99, 0);
    r.hu = { disc: n(r.hu && r.hu.disc, 0, 100, 2), others: n(r.hu && r.hu.others, 0, 100, 0) };
    r.zimo = n(r.zimo, 0, 100, 1); r.dealerMult = n(r.dealerMult, 0.5, 10, 1);
    r.streak = Math.round(n(r.streak, 0, 99, 0)); r.order = Math.round(n(r.order, 0, 999, 0));
    ['invalid', 'false'].forEach(function (k) { var p = (r.pen && r.pen[k]) || {}; r.pen[k] = { kind: ['split', 'each', 'limit'].indexOf(p.kind) >= 0 ? p.kind : 'split', amount: n(p.amount, 0, 1000000, 0) }; });
    var dr = r.draw || {}; r.draw = { kind: dr.kind === 'tenpai' ? 'tenpai' : 'zero', t: [0, 1, 2].map(function (i) { return n(dr.t && dr.t[i], 0, 1000, [3, 2, 1][i]); }), byMin: dr.byMin !== false };
    ['hidden', 'events', 'flowersMin', 'baseHost', 'minIsBase', 'multi', 'stayDraw', 'stayPen', 'deadwall', 'hostSets', 'seatDefault', 'start'].forEach(function (k) { r[k] = !!r[k]; });
    r.seat = r.seat === 'host' ? 'host' : 'off'; r.startDefault = String(r.startDefault || '200').slice(0, 6);
    r.patterns = cleanPatterns(r.patterns, e);
    delete r.v;
    return { rules: r, errors: e };
  }

  var api = { DEFAULTS: DEFAULTS, BUILTIN: BUILTIN, FAMILIES: FAMILIES, BUILTIN_FAMILIES: BUILTIN_FAMILIES, FAM_COLOURS: FAM_COLOURS, family: family, cleanFamily: cleanFamily, registry: registry, setSaved: setSaved, current: current, version: version, list: list, exists: exists,
    rulesOf: rulesOf, pinVersion: pinVersion, config: config, valueOf: valueOf, scoreEvent: scoreEvent, replay: replay, seatAt: seatAt, SEAT_ORDER: SEAT_ORDER, kinds: kinds, clean: clean,
    riichiReplay: riichiReplay, riichiWin: riiWin, riichiDraw: riiDraw, riichiBasic: riiBasic, riichiLimit: riiLimit, riichiFinal: riichiFinal };
  root.TBTRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

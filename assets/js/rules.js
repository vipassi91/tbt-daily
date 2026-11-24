/* TBT scoring rules: one engine for the scoreboard (browser) and the server (functions/_scoring.js imports this file).
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
    picker: 'tbt',           // which Pick Patterns and Pick Tiles belong to it: 'tbt' | 'hk' | 'mcr'
    pay: 'table',            // 'table': table[value] | 'double': 2 to the power of the value | 'same': the value itself
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
    startDefault: '200'
  };
  function R(o) { var r = clone(DEFAULTS); Object.keys(o).forEach(function (k) { r[k] = clone(o[k]); }); if (!r.short) r.short = r.name; return r; }
  var MCR = { fam: 'mcr', unit: 'points', entry: 'typed', picker: 'mcr', pay: 'same', limit: 0, minIsBase: true, hu: { disc: 1, others: 0 }, zimo: 1, dealerMult: 1, multi: false, streak: 1,
    pen: { invalid: { kind: 'split', amount: 24 }, false: { kind: 'split', amount: 48 } }, draw: { kind: 'zero', t: [3, 2, 1], byMin: true }, seat: 'host', seatDefault: false, start: false };
  var HK = { fam: 'hk', unit: 'fan', entry: 'typed', picker: 'hk', pay: 'table', table: HK_TABLE.slice(), limit: 13, min: 3, flowersMin: true, hu: { disc: 2, others: 0 }, zimo: 1, dealerMult: 1, multi: false, streak: 0, stayDraw: true, stayPen: true,
    pen: { invalid: { kind: 'limit', amount: 0 }, false: { kind: 'limit', amount: 0 } }, draw: { kind: 'zero', t: [3, 2, 1], byMin: true }, seat: 'off', start: false };
  function ext(a, b) { var o = clone(a); Object.keys(b).forEach(function (k) { o[k] = b[k]; }); return o; }
  var FAMILIES = [
    { id: 'tbt', name: 'TBT', col: '#2D6A4F' }, { id: 'hk', name: 'HK Classic', col: '#B72323' }, { id: 'mcr', name: 'MCR', col: '#2F5D9E' }
  ];
  var BUILTIN = [
    R({ id: 'casual', name: 'Casual', order: 1, min: 1, streak: 4 }),
    R({ id: 'default', name: 'Default', order: 2, min: 2, streak: 4 }),
    R({ id: 'tournament', name: 'Tournament', order: 3, min: 2, streak: 1, seat: 'host', seatDefault: true, startDefault: '240' }),
    R({ id: 'custom', name: 'Custom', order: 4, min: 2, streak: 4, hostSets: true, seat: 'host', seatDefault: true }),
    R(ext(HK, { id: 'hkc', name: 'Half Spicy', short: 'HK Half Spicy', order: 1 })),
    R(ext(HK, { id: 'hkf', name: 'Full Spicy', short: 'HK Full Spicy', order: 2, pay: 'double' })),
    R(ext(MCR, { id: 'mcr4', name: 'MCR-4', order: 1, base: 4, min: 4 })),
    R(ext(MCR, { id: 'mcr8', name: 'MCR-8', order: 2, base: 8, min: 8 })),
    R(ext(MCR, { id: 'mcrc', name: 'MCR-Custom', order: 3, base: 3, min: 3, baseHost: true }))
  ];
  BUILTIN.forEach(function (r) { r.v = 1; });

  // ---- the registry: every version of every mode, built in and saved ----
  // saved: [{id, v, data}] from the database (data: the full ruleset). Later versions override; a mode only in the database is new.
  function registry(saved) {
    var by = {};
    BUILTIN.forEach(function (r) { by[r.id] = [r]; });
    (saved || []).slice().sort(function (a, b) { return a.v - b.v; }).forEach(function (s) {
      if (!s || !s.id || !s.data) return;
      var r = R(s.data); r.id = s.id; r.v = s.v; (by[s.id] = by[s.id] || []).push(r);
    });
    Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return a.v - b.v; }); });
    return { by: by, families: FAMILIES };
  }
  var REG = registry([]);
  function setSaved(saved) { REG = registry(saved); return REG; }
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
    return cfg;
  }
  // what a hand of n (points or fan) is worth
  function valueOf(rs, n) {
    var x = Math.max(0, Math.round(num(n)));
    if (rs.limit > 0) x = Math.min(x, rs.limit);
    if (rs.pay === 'double') return Math.pow(2, x);
    if (rs.pay === 'same') return x;
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

  // MCR seat rotation: which seat deals each of the 4 hands in a wind round (row 0 East; rows 1-3 the fixed MCR permutations)
  var SEAT_ORDER = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 1, 0], [3, 2, 0, 1]];
  function seatAt(wind, turn, seatRotation) { return seatRotation ? SEAT_ORDER[wind][turn] : turn; }
  // every hand in order: dealer, streak, wind round and each hand's score changes. A wind round ends once 4 dealer turns have passed.
  function replay(events, cfg) {
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
  function kinds(rs) { return rs.multi ? ['hu', 'zimo', 'double', 'triple', 'invalid', 'false', 'draw'] : ['hu', 'zimo', 'invalid', 'false', 'draw']; }

  // ---- a saved ruleset, checked: wrong shapes are refused, numbers kept in range ----
  function clean(data) {
    var r = R(data || {}), e = [];
    function n(v, lo, hi, d) { var x = parseFloat(v); if (isNaN(x)) return d; return Math.min(hi, Math.max(lo, x)); }
    r.name = String(r.name || '').trim().slice(0, 30); if (!r.name) e.push('Name is empty');
    r.short = String(r.short || r.name).trim().slice(0, 30);
    r.help = String(r.help || '').slice(0, 1500);
    if (['tbt', 'hk', 'mcr'].indexOf(r.fam) < 0) e.push('Unknown family');
    if (['points', 'fan'].indexOf(r.unit) < 0) r.unit = 'points';
    if (['grid', 'typed'].indexOf(r.entry) < 0) r.entry = 'grid';
    if (['tbt', 'hk', 'mcr'].indexOf(r.picker) < 0) r.picker = r.fam;
    if (['table', 'double', 'same'].indexOf(r.pay) < 0) r.pay = 'table';
    r.limit = Math.round(n(r.limit, 0, 99, 13));
    r.table = (Array.isArray(r.table) ? r.table : []).slice(0, 100).map(function (x) { return n(x, 0, 1000000, 0); });
    if (r.pay === 'table' && r.table.length < (r.limit || 13) + 1) e.push('The payout table needs a value up to the limit');
    r.min = Math.round(n(r.min, 0, 99, 1)); r.base = n(r.base, 0, 99, 0);
    r.hu = { disc: n(r.hu && r.hu.disc, 0, 100, 2), others: n(r.hu && r.hu.others, 0, 100, 0) };
    r.zimo = n(r.zimo, 0, 100, 1); r.dealerMult = n(r.dealerMult, 0.5, 10, 1);
    r.streak = Math.round(n(r.streak, 0, 99, 0)); r.order = Math.round(n(r.order, 0, 999, 0));
    ['invalid', 'false'].forEach(function (k) { var p = (r.pen && r.pen[k]) || {}; r.pen[k] = { kind: ['split', 'each', 'limit'].indexOf(p.kind) >= 0 ? p.kind : 'split', amount: n(p.amount, 0, 1000000, 0) }; });
    var dr = r.draw || {}; r.draw = { kind: dr.kind === 'tenpai' ? 'tenpai' : 'zero', t: [0, 1, 2].map(function (i) { return n(dr.t && dr.t[i], 0, 1000, [3, 2, 1][i]); }), byMin: dr.byMin !== false };
    ['hidden', 'events', 'flowersMin', 'baseHost', 'minIsBase', 'multi', 'stayDraw', 'stayPen', 'deadwall', 'hostSets', 'seatDefault', 'start'].forEach(function (k) { r[k] = !!r[k]; });
    r.seat = r.seat === 'host' ? 'host' : 'off'; r.startDefault = String(r.startDefault || '200').slice(0, 6);
    delete r.v;
    return { rules: r, errors: e };
  }

  var api = { DEFAULTS: DEFAULTS, BUILTIN: BUILTIN, FAMILIES: FAMILIES, registry: registry, setSaved: setSaved, current: current, version: version, list: list, exists: exists,
    rulesOf: rulesOf, pinVersion: pinVersion, config: config, valueOf: valueOf, scoreEvent: scoreEvent, replay: replay, seatAt: seatAt, SEAT_ORDER: SEAT_ORDER, kinds: kinds, clean: clean };
  root.TBTRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

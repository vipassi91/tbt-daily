import { isAdmin, json, unauthorized } from '../../_auth.js';
import { buildStats, validGame, nextStamp } from '../../_tables.js';
import { replay, modeConfig, T } from '../../_scoring.js';

// POST /api/admin/table-mode (admin only): change the scoring mode of a table to another mode of the same family (MCR-Custom to MCR-8,
// HK Half Spicy to Full Spicy, Casual to Tournament...). The hands stay as they are; they are scored again under the new mode's rules.
//   body: { code, mode, apply: true | false, mcrBase?, custom?: {minPoint, maxStreak, deadwall}, seatRotation? }
//   apply false (the default): only say what would change, nothing is written. apply true: rewrite the table and rebuild its leaderboard stats.
//   A different family is refused: a TBT point, an MCR point and a riichi hand are not the same thing, so the hands would mean something else.
//   A table saved as final stays final. The table moves to the current version of the new mode.
const r2 = n => Math.round(n * 100) / 100;
function nets(g) { const rp = replay(g.events || [], modeConfig(g)); return { rp, net: [0, 1, 2, 3].map(i => r2(rp.hands.filter(h => !h.late).reduce((a, h) => a + h.deltas[i], 0))) }; }
function wonPts(ev) { const w = ev.kind === 'hu' || ev.kind === 'zimo' ? [ev.winner] : (ev.kind === 'double' || ev.kind === 'triple') ? (ev.winners || []) : []; return w.map(x => ({ seat: x, pts: Number(ev.pts && ev.pts[x]) })).filter(x => isFinite(x.pts)); }
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'Invalid request' }, 400); }
    const code = String(body.code || '').toUpperCase(), mode = String(body.mode || ''), apply = body.apply === true;
    const t = await env.DB.prepare('SELECT id, players, rounds, updated_at FROM tables WHERE code=?').bind(code).first();
    if (!t) return json({ error: 'not_found', message: 'Table code not found' }, 404);
    let game; try { game = JSON.parse(t.rounds); } catch (e) { return json({ error: 'Invalid game data' }, 400); }
    const fromRs = T.rulesOf(game), to = T.current(mode);
    if (!to) return json({ error: 'bad_mode', message: 'Unknown mode.' }, 400);
    const sameFam = to.fam === fromRs.fam;
    const siblings = T.list(true).filter(r => r.fam === fromRs.fam).map(r => ({ id: r.id, name: r.short || r.name, hidden: !!r.hidden }));
    if (!sameFam) return json({ error: 'other_family', message: 'Only a mode of the same family can be chosen: the hands would mean something else under another family.', siblings }, 400);
    // the new game: same names and hands, the new mode, and the table options the new mode uses
    const g = JSON.parse(JSON.stringify(game));
    g.mode = to.id;
    if (Array.isArray(g.events) && g.events.length) g.rv = to.v; else delete g.rv;
    if (to.baseHost) { const n = parseFloat(body.mcrBase != null ? body.mcrBase : g.mcrBase); g.mcrBase = isNaN(n) ? to.base : Math.min(99, Math.max(0, Math.round(n))); }
    if (to.hostSets) { const c = Object.assign({ minPoint: 2, maxStreak: 4, deadwall: false }, g.custom || {}, body.custom || {}); g.custom = { minPoint: String(c.minPoint), maxStreak: String(c.maxStreak), deadwall: !!c.deadwall }; }
    if (to.seat === 'host') g.seatRotation = body.seatRotation != null ? !!body.seatRotation : (fromRs.seat === 'host' ? g.seatRotation !== false : !!to.seatDefault); else g.seatRotation = false;
    if (!to.start) { g.useStart = false; g.bankrupt = false; }
    if (!validGame(g)) return json({ error: 'bad_hands', message: 'Some hands cannot be recorded under this mode, so it cannot be chosen for this table.' }, 400);
    const a = nets(game), b = nets(g), cfg = modeConfig(g), names = Array.isArray(game.names) ? game.names : ['', '', '', ''];
    const low = [];
    (g.events || []).forEach((ev, i) => { if (b.rp.hands[i] && b.rp.hands[i].late) return; wonPts(ev).forEach(x => { if (x.pts < cfg.minPoint) low.push({ hand: i + 1, name: names[x.seat] || 'Player ' + (x.seat + 1), pts: x.pts }); }); });
    const summary = {
      from: fromRs.short || fromRs.name, to: to.short || to.name, hands: (game.events || []).length,
      people: [0, 1, 2, 3].map(i => ({ name: names[i] || 'Player ' + (i + 1), before: a.net[i], after: b.net[i] })),
      dealerChanged: a.rp.hands.filter((h, i) => b.rp.hands[i] && h.dealer !== b.rp.hands[i].dealer).length,
      doneBefore: !!a.rp.done, doneAfter: !!b.rp.done, lateBefore: a.rp.hands.filter(h => h.late).length, lateAfter: b.rp.hands.filter(h => h.late).length,
      minPoint: cfg.minPoint, unit: cfg.unit, low,
      options: { baseHost: !!to.baseHost, mcrBase: to.baseHost ? g.mcrBase : null, hostSets: !!to.hostSets, custom: to.hostSets ? g.custom : null, seat: to.seat === 'host', seatRotation: !!g.seatRotation, startDropped: !to.start && !!game.useStart },
      locked: !!game.lockedAt, siblings
    };
    if (!apply) return json({ ok: true, applied: false, summary });
    if (to.id === fromRs.id && JSON.stringify(g) === JSON.stringify(game)) return json({ error: 'same', message: 'Nothing changes.' }, 400);
    let stats; try { stats = buildStats(g, JSON.parse(t.players)); } catch (e) { return json({ error: 'Invalid game data' }, 400); }
    const now = nextStamp(t.updated_at);
    const res = await env.DB.prepare('UPDATE tables SET rounds=?, stats=?, updated_at=? WHERE code=? AND updated_at=?').bind(JSON.stringify(g), JSON.stringify(stats), now, code, t.updated_at).run();
    if (!res.meta || res.meta.changes !== 1) return json({ error: 'conflict', message: 'The table changed while this was being processed. Reload and try again.' }, 409);
    return json({ ok: true, applied: true, updatedAt: now, summary });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

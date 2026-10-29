import { isAdmin, json, unauthorized } from '../../_auth.js';
import { buildStats, validGame, nextStamp, permuteGame } from '../../_tables.js';
import { replay, modeConfig } from '../../_scoring.js';
import { cleanText, nameKey, loadRegistry, seatOwner, guestRuleOn } from '../../_players.js';

// POST /api/admin/table-order (admin only): fix the players of a saved table, the order they sit in and/or their names.
//   body: { code, order: [old seat of the person in new seat 1, 2, 3, 4], names?: [the name for new seat 1, 2, 3, 4], apply: true | false }
//   apply false (the default): only say what would change, nothing is written
//   apply true: rewrite the table. Every hand follows its person, dealers and winds are worked out again, the leaderboard stats are rebuilt,
//   the seats the admin linked to registered players move with the people (a seat that is renamed loses its link: the link was for the old name),
//   and a table saved as final stays final.
const r2 = n => Math.round(n * 100) / 100, NAME_MAX = 16, cmp = s => cleanText(s, 200);
function netByNew(rp) { return [0, 1, 2, 3].map(i => r2(rp.hands.filter(h => !h.late).reduce((a, h) => a + h.deltas[i], 0))); }
function summarizeMove(game, moved, order) {
  const a = replay(game.events, modeConfig(game)), b = replay(moved.events, modeConfig(moved));
  const before = netByNew(a), after = netByNew(b);
  const dealerChanged = a.hands.filter((h, i) => h.dealer !== order[b.hands[i].dealer]).length;   // by person (old seat), not by the spelling of the name
  return {
    hands: game.events.length, dealerChanged,
    people: [0, 1, 2, 3].map(j => ({ name: moved.names[j], before: before[order[j]], after: after[j] })),
    doneBefore: !!a.done, doneAfter: !!b.done,
    lateBefore: a.hands.filter(h => h.late).length, lateAfter: b.hands.filter(h => h.late).length,
    firstDealerBefore: game.names[0], firstDealerAfter: moved.names[0], firstDealerChanged: order[0] !== 0,
  };
}
// the names the admin typed, checked: the person keeps the old name unless it really changed
function applyNames(game, moved, names) {
  if (names === undefined) return { renamed: [] };
  if (!Array.isArray(names) || names.length !== 4 || names.some(n => typeof n !== 'string')) return { error: 'There must be four names, one per seat.' };
  const renamed = [], final = moved.names.slice();
  for (let j = 0; j < 4; j++) {
    if (cmp(names[j]) === cmp(moved.names[j])) continue;                       // unchanged: keep it exactly as it was
    const to = cleanText(names[j], 200);
    if (!to) return { error: 'The name at seat ' + (j + 1) + ' cannot be empty.' };
    if (to.length > NAME_MAX) return { error: 'The name at seat ' + (j + 1) + ' is too long (' + NAME_MAX + ' characters at most).' };
    final[j] = to; renamed.push(j);
  }
  for (const j of renamed) for (let k = 0; k < 4; k++) if (k !== j && nameKey(final[k]) === nameKey(final[j])) return { error: 'The name "' + final[j] + '" is already used at seat ' + (k + 1) + '. Two players at one table cannot have the same name.' };
  moved.names = final;
  return { renamed };
}
// who the registry says each new seat is (a renamed seat has lost its link, the others keep theirs)
function owners(reg, tableId, order, moved, renamed) {
  if (!reg.ready || !guestRuleOn(reg)) return null;
  return [0, 1, 2, 3].map(j => renamed.includes(j) ? ((reg.names.get(nameKey(moved.names[j])) && reg.players.has(reg.names.get(nameKey(moved.names[j])))) ? reg.names.get(nameKey(moved.names[j])) : null) : seatOwner(reg, tableId, order[j], nameKey(moved.names[j])).id);
}
async function seatRows(env, tableId) {
  try { return (await env.DB.prepare('SELECT seat, name_key, registry_id, created_at FROM registry_seats WHERE table_id=?').bind(tableId).all()).results || []; } catch (e) { return []; }   // the registry may not be set up yet
}
async function moveSeats(env, tableId, rows, order, renamed) {
  if (!rows.length) return 0;
  const inv = []; order.forEach((o, j) => { inv[o] = j; });
  const list = [env.DB.prepare('DELETE FROM registry_seats WHERE table_id=?').bind(tableId)];
  let kept = 0;
  rows.forEach(r => { if (renamed.includes(inv[r.seat])) return; kept++; list.push(env.DB.prepare('INSERT INTO registry_seats (table_id, seat, name_key, registry_id, created_at) VALUES (?,?,?,?,?)').bind(tableId, inv[r.seat], r.name_key, r.registry_id, r.created_at)); });
  await env.DB.batch(list);
  return kept;
}
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'Invalid request' }, 400); }
    const code = String(body.code || '').toUpperCase(), order = body.order, apply = body.apply === true;
    const t = await env.DB.prepare('SELECT id, players, rounds, updated_at FROM tables WHERE code=?').bind(code).first();
    if (!t) return json({ error: 'Table code not found' }, 404);
    let game; try { game = JSON.parse(t.rounds); } catch (e) { return json({ error: 'Invalid game data' }, 400); }
    if (!Array.isArray(game.events) || game.events.length === 0) return json({ error: 'no_hands', message: 'This table has no hands yet. Players can still be changed directly on the scoreboard.' }, 400);
    const moved = permuteGame(game, order);
    if (!moved) return json({ error: 'bad_order', message: 'The order is not valid.' }, 400);
    const nm = applyNames(game, moved, body.names);
    if (nm.error) return json({ error: 'bad_names', message: nm.error }, 400);
    if (!validGame(moved)) return json({ error: 'bad_order', message: 'The order is not valid.' }, 400);
    const reg = await loadRegistry(env), own = owners(reg, t.id, order, moved, nm.renamed);
    if (own) for (const j of nm.renamed) { if (own[j] && own.some((o, k) => k !== j && o === own[j])) return json({ error: 'same_person', message: 'The name "' + moved.names[j] + '" is recognised as the registered player "' + reg.players.get(own[j]).nickname + '", who already sits at another seat at this table. One person cannot fill two seats.' }, 400); }
    const rows = await seatRows(env, t.id), inv = []; order.forEach((o, j) => { inv[o] = j; });
    const summary = summarizeMove(game, moved, order);
    summary.renamed = nm.renamed.map(j => ({ seat: j + 1, from: game.names[order[j]], to: moved.names[j], registered: own && own[j] ? reg.players.get(own[j]).nickname : null }));
    summary.registryOn = !!own;
    summary.linksDropped = rows.filter(r => nm.renamed.includes(inv[r.seat])).length;
    if (!apply) return json({ ok: true, applied: false, summary });
    let stats; try { stats = buildStats(moved, JSON.parse(t.players)); } catch (e) { return json({ error: 'Invalid game data' }, 400); }
    const text = JSON.stringify(moved);
    if (text.length > 200000) return json({ error: 'Game too large' }, 413);
    const now = nextStamp(t.updated_at);
    const res = await env.DB.prepare('UPDATE tables SET rounds=?, players=?, stats=?, updated_at=? WHERE code=? AND updated_at=?').bind(text, JSON.stringify(stats.names), JSON.stringify(stats), now, code, t.updated_at).run();
    if (!res.meta || res.meta.changes !== 1) return json({ error: 'conflict', message: 'The table changed while this was being processed. Reload and try again.' }, 409);
    const seats = await moveSeats(env, t.id, rows, order, nm.renamed);
    return json({ ok: true, applied: true, updatedAt: now, seatsMoved: seats, summary });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

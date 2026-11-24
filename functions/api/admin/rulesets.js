import { isAdmin, json, unauthorized } from '../../_auth.js';
import { T } from '../../_scoring.js';
import { ensureRulesets, loadRules, forgetRules, savedRules, modeList, newId } from '../../_rulesets.js';

// GET  /api/admin/rulesets: every mode with all its versions, the built-in rules, and how many tables use each version (admin only)
// POST /api/admin/rulesets { id, data, note }: saves data as the next version of mode id (admin only).
//      Without id (or an id that does not exist yet) it is a new sub-mode: its id is made from the name. Tables that already
//      have a hand keep their version; new tables use the new one.
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const saved = await loadRules(env, true);
    const usage = {};
    const r = await env.DB.prepare('SELECT rounds FROM tables').all();
    (r.results || []).forEach(function (t) {
      let g = null; try { g = JSON.parse(t.rounds); } catch (e) { g = null; }
      if (!g) return;
      const m = g.mode || 'casual', u = usage[m] || (usage[m] = { open: 0, v: {} });
      if (!Array.isArray(g.events) || !g.events.length) { u.open++; return; }
      const v = g.rv || 1; u.v[v] = (u.v[v] || 0) + 1;
    });
    const versions = T.registry(saved).by;
    return json(Object.assign({ versions: versions, notes: saved.map(function (x) { return { id: x.id, v: x.v, note: x.note, at: x.at }; }), builtin: T.BUILTIN, defaults: T.DEFAULTS, usage: usage }, modeList()));
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    await ensureRulesets(env);
    await loadRules(env, true);
    const c = T.clean(b && b.data);
    if (c.errors.length) return json({ error: c.errors.join('. ') }, 400);
    let id = b && typeof b.id === 'string' && T.exists(b.id) ? b.id : null;
    if (id) {
      const cur = T.current(id);
      if (cur.fam !== c.rules.fam || cur.picker !== c.rules.picker || cur.entry !== c.rules.entry) return json({ error: 'The family of a mode cannot change' }, 400);
    } else id = newId(c.rules.name);
    const row = await env.DB.prepare('SELECT MAX(v) AS v FROM rulesets WHERE id=?').bind(id).first();
    const v = Math.max(row && row.v ? row.v : 0, T.exists(id) ? T.current(id).v : 0) + 1;
    const note = String((b && b.note) || '').slice(0, 200);
    await env.DB.prepare('INSERT INTO rulesets (id, v, data, note, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, v, JSON.stringify(c.rules), note, new Date().toISOString()).run();
    forgetRules();
    await loadRules(env, true);
    return json({ ok: true, id: id, v: v });
  } catch (err) {
    return json({ error: 'Could not save. ' + String(err) }, 500);
  }
}

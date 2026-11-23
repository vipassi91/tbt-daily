import { json } from '../../_auth.js';
import { loadRegistry, nameKey } from '../../_players.js';
import { guessBlocked, guessMiss, tooManyGuesses } from '../../_hostauth.js';

// GET /api/names/:code (a table's edit code): every registered player, for the name suggestions of that table's scoreboard.
// Only someone holding a table's edit code (the host) gets it, because it carries the players' real names: a host may hear
// "Yuli" at the table while the player is registered as "Mymories". n = nickname (the name to write in the seat),
// f = the real name when it differs, a = the other names that already lead to this player.
// Nothing else (no WhatsApp, no Instagram). Wrong codes are counted like on the scoreboard.
export async function onRequestGet({ request, env, params }) {
  if (await guessBlocked(request)) return tooManyGuesses();
  try {
    const t = await env.DB.prepare('SELECT id FROM tables WHERE code=?').bind(String(params.code || '').toUpperCase()).first();
    if (!t) { if (await guessMiss(env, request)) return tooManyGuesses(); return json({ error: 'Table code not found' }, 404); }
    const reg = await loadRegistry(env);
    if (!reg.ready) return json({ players: [] });
    const alias = new Map();
    reg.names.forEach(function (id, key) { (alias.get(id) || alias.set(id, []).get(id)).push(key); });
    const out = [];
    reg.players.forEach(function (p) {
      const nk = nameKey(p.nickname), o = { n: p.nickname };
      if (p.fullName && nameKey(p.fullName) !== nk) o.f = p.fullName;
      const a = (alias.get(p.id) || []).filter(function (k) { return k !== nk && k !== nameKey(p.fullName); });
      if (a.length) o.a = a.slice(0, 8);
      out.push(o);
    });
    return new Response(JSON.stringify({ players: out }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
  } catch (err) {
    return json({ error: 'Could not load names' }, 500);
  }
}

import { respond, requireHost, hashPassword, checkPassword, lastSix, ipKey, addEvent, countEvents } from '../../_hostauth.js';
import { nameKey } from '../../_players.js';

// POST /api/host/password { current, next }
// The first time (after the admin made or reset the host) no current password is asked: it was just typed to log in.
export async function onRequestPost({ request, env }) {
  try {
    const g = await requireHost(request, env, { allowMustChange: true }); if (g.res) return g.res;
    const h = g.host;
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const next = String((b && b.next) || ''), current = String((b && b.current) || '');
    if (!h.mustChange) {
      if ((await countEvents(env, 'pwchange', h.id, 15 * 60 * 1000)) >= 5) return respond({ error: 'Too many tries. Try again in 15 minutes.' }, 429);
      const row = await env.DB.prepare('SELECT pw_hash, pw_salt FROM registry_hosts WHERE registry_id=?').bind(h.id).first();
      if (!row || !(await checkPassword(current, row.pw_salt, row.pw_hash))) { await addEvent(env, 'pwchange', h.id); return respond({ error: 'Your current password is wrong.' }, 403); }
      if (current === next) return respond({ error: 'Choose a password different from the current one.' }, 400);
    }
    if (next.length < 8) return respond({ error: 'Use at least 8 characters.' }, 400);
    if (next.length > 72) return respond({ error: 'Use 72 characters or fewer.' }, 400);
    const six = lastSix(h.whatsapp);
    if (six && next.indexOf(six) >= 0) return respond({ error: 'Choose something that is not part of your phone number.' }, 400);
    if (nameKey(next) === nameKey(h.nickname)) return respond({ error: 'Choose something other than your nickname.' }, 400);
    const p = await hashPassword(next);
    await env.DB.prepare('UPDATE registry_hosts SET pw_hash=?, pw_salt=?, must_change=0, first_until=NULL WHERE registry_id=?').bind(p.hash, p.salt, h.id).run();
    await env.DB.prepare('DELETE FROM host_logins WHERE registry_id=? AND token_hash<>?').bind(h.id, h.tokenHash).run();   // every other phone is signed out
    return respond({ ok: true });
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}

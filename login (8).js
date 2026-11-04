import { respond, ensureHostTables, ipKey, addEvent, countEvents, checkPassword, dummyHash, newLogin, cookieFor } from '../../_hostauth.js';
import { nameKey } from '../../_players.js';

// POST /api/host/login { nickname, password }
// One plain message for every failure, so the page never says who is a host. Wrong tries are counted per address and nickname, per nickname, and per address.
const WINDOW = 15 * 60 * 1000, WRONG = 'Nickname or password is wrong.';
export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get('x-tbt') !== 'host') return respond({ error: 'Not allowed' }, 403);
    await ensureHostTables(env);
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const nick = nameKey(b && b.nickname), password = String((b && b.password) || '');
    if (!nick || !password || password.length > 200) return respond({ error: WRONG }, 401);
    const ip = await ipKey(request);
    if ((await countEvents(env, 'hostlogin', ip + '|' + nick, WINDOW)) >= 5 || (await countEvents(env, 'hostlogin-nick', nick, WINDOW)) >= 15 || (await countEvents(env, 'hostlogin-ip', ip, WINDOW)) >= 40) {
      return respond({ error: 'Too many tries. Try again in 15 minutes.' }, 429);
    }
    const all = await env.DB.prepare('SELECT id, nickname FROM registry').all();
    const row = all.results.filter(function (r) { return nameKey(r.nickname) === nick; })[0];
    const host = row ? await env.DB.prepare('SELECT * FROM registry_hosts WHERE registry_id=?').bind(row.id).first() : null;
    let ok = false;
    if (host) {
      ok = await checkPassword(password, host.pw_salt, host.pw_hash);
      if (ok && host.must_change && host.first_until && host.first_until < new Date().toISOString()) ok = false;   // the first password lasts 7 days
    } else await dummyHash(password);
    if (!ok) {
      await addEvent(env, 'hostlogin', ip + '|' + nick); await addEvent(env, 'hostlogin-nick', nick); await addEvent(env, 'hostlogin-ip', ip);
      return respond({ error: WRONG }, 401);
    }
    await env.DB.prepare('UPDATE registry_hosts SET last_login=? WHERE registry_id=?').bind(new Date().toISOString(), row.id).run();
    const l = await newLogin(env, row.id);
    return respond({ ok: true, nickname: row.nickname, mustChange: !!host.must_change }, 200, cookieFor(l.token, l.maxAge));
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}

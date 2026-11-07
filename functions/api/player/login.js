import { respond, ensurePlayerTables, ipKey, addEvent, countEvents, checkPassword, dummyHash, newPlayerLogin, cookieFor } from '../../_playeraccount.js';
import { nameKey } from '../../_players.js';

// POST /api/player/login { nickname, password }
// One plain message for every failure, so the page never says who has claimed their page. Wrong tries are counted per address and nickname, per nickname, and per address.
const WINDOW = 15 * 60 * 1000, WRONG = 'Nickname or password is wrong.';
export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get('x-tbt') !== 'player') return respond({ error: 'Not allowed' }, 403);
    await ensurePlayerTables(env);
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const nick = nameKey(b && b.nickname), password = String((b && b.password) || '');
    if (!nick || !password || password.length > 200) return respond({ error: WRONG }, 401);
    const ip = await ipKey(request);
    if ((await countEvents(env, 'plogin', ip + '|' + nick, WINDOW)) >= 5 || (await countEvents(env, 'plogin-nick', nick, WINDOW)) >= 15 || (await countEvents(env, 'plogin-ip', ip, WINDOW)) >= 40) {
      return respond({ error: 'Too many tries. Try again in 15 minutes.' }, 429);
    }
    const all = await env.DB.prepare('SELECT id, nickname, hidden FROM registry').all();
    const row = all.results.filter(function (r) { return nameKey(r.nickname) === nick; })[0];
    const acc = row && !row.hidden ? await env.DB.prepare('SELECT * FROM player_accounts WHERE registry_id=?').bind(row.id).first() : null;
    let ok = false;
    if (acc) ok = await checkPassword(password, acc.pw_salt, acc.pw_hash); else await dummyHash(password);
    if (!ok) { await addEvent(env, 'plogin', ip + '|' + nick); await addEvent(env, 'plogin-nick', nick); await addEvent(env, 'plogin-ip', ip); return respond({ error: WRONG }, 401); }
    await env.DB.prepare('UPDATE player_accounts SET last_login=? WHERE registry_id=?').bind(new Date().toISOString(), row.id).run();
    const l = await newPlayerLogin(env, row.id);
    return respond({ ok: true, id: row.id, nickname: row.nickname }, 200, cookieFor(l.token, l.maxAge));
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}

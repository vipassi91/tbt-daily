import { respond, ensurePlayerTables, readCookie, sha256Hex, cookieFor } from '../../_playeraccount.js';

// POST /api/player/logout: signs this phone out and clears the cookie.
export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get('x-tbt') !== 'player') return respond({ error: 'Not allowed' }, 403);
    await ensurePlayerTables(env);
    const token = readCookie(request);
    if (token) await env.DB.prepare('DELETE FROM player_logins WHERE token_hash=?').bind(await sha256Hex(token)).run();
    return respond({ ok: true }, 200, cookieFor('', 0));
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}

import { respond, ensureHostTables, readCookie, sha256Hex, cookieFor } from '../../_hostauth.js';

// POST /api/host/logout: forgets this phone.
export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get('x-tbt') !== 'host') return respond({ error: 'Not allowed' }, 403);
    await ensureHostTables(env);
    const t = readCookie(request);
    if (t) await env.DB.prepare('DELETE FROM host_logins WHERE token_hash=?').bind(await sha256Hex(t)).run();
    return respond({ ok: true }, 200, cookieFor('', 0));
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}

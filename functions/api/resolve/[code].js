import { json } from '../../_auth.js';

// GET /api/resolve/:code -> public. Tells the "enter a code" page whether
// a code is a host code or a player code, so one shared page can send
// people to the right place without them having to know which kind they
// were given. Codes are generated unique across both columns, so a match
// in one column can never also match in the other.
export async function onRequestGet({ env, params }) {
  try {
    const code = params.code.toUpperCase();
    const asHost = await env.DB.prepare('SELECT id FROM tables WHERE code=?').bind(code).first();
    if (asHost) return json({ type: 'host', code });
    const asView = await env.DB.prepare('SELECT id FROM tables WHERE view_code=?').bind(code).first();
    if (asView) return json({ type: 'view', code });
    return json({ error: 'Code not found' }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

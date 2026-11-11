import { isAdmin, json, unauthorized } from '../../_auth.js';
import { loadHome, saveHome, forgetHome, HOME_DEFAULT, HOME_LIMITS } from '../../_home.js';

// GET  /api/admin/home: the home page words as they are now, the defaults and the limits (admin only)
// POST /api/admin/home { kick, l1, hl, l2, intro, title, desc }: saves them (admin only). The home page shows them within a minute.
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  forgetHome();
  const text = await loadHome(env);
  return json({ text: text, defaults: HOME_DEFAULT, limits: HOME_LIMITS });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    const text = await saveHome(env, b);
    return json({ ok: true, text: text });
  } catch (err) {
    return json({ error: 'Could not save. Please try again.' }, 500);
  }
}

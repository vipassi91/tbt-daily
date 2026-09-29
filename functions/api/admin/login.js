import { isAdmin, json, unauthorized } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  return json({ ok: true });
}

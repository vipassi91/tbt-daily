import { isAdmin, json, unauthorized } from '../../_auth.js';
import { ensureHostTables, listHosts, hashPassword, lastSix, FIRST_PASSWORD_MS } from '../../_hostauth.js';

// GET /api/admin/hosts (admin): the hosts.   POST { action: grant | reset | revoke, id } (admin)
// The first password is the last 6 digits of the player's WhatsApp number. It is only ever stored as a hash, valid for 7 days, and the host must replace it
// at the first login. The admin never receives a password.
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try { return json({ hosts: await listHosts(env) }); } catch (err) { return json({ error: String(err) }, 500); }
}
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await ensureHostTables(env);
    let b; try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
    const action = b && b.action, id = String((b && b.id) || '');
    const pl = await env.DB.prepare('SELECT id, nickname, whatsapp FROM registry WHERE id=?').bind(id).first();
    if (!pl) return json({ error: 'Player not found' }, 404);
    const existing = await env.DB.prepare('SELECT registry_id FROM registry_hosts WHERE registry_id=?').bind(id).first();
    const now = new Date();
    if (action === 'revoke') {
      await env.DB.prepare('DELETE FROM registry_hosts WHERE registry_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM host_logins WHERE registry_id=?').bind(id).run();
      return json({ ok: true });
    }
    if (action !== 'grant' && action !== 'reset') return json({ error: 'Unknown action' }, 400);
    if (action === 'grant' && existing) return json({ error: pl.nickname + ' is already a host.' }, 409);
    if (action === 'reset' && !existing) return json({ error: pl.nickname + ' is not a host.' }, 404);
    const six = lastSix(pl.whatsapp);
    if (!six) return json({ error: 'Add a WhatsApp number for ' + pl.nickname + ' first.' }, 400);
    const p = await hashPassword(six), until = new Date(now.getTime() + FIRST_PASSWORD_MS).toISOString();
    if (existing) await env.DB.prepare('UPDATE registry_hosts SET pw_hash=?, pw_salt=?, must_change=1, first_until=? WHERE registry_id=?').bind(p.hash, p.salt, until, id).run();
    else await env.DB.prepare('INSERT INTO registry_hosts (registry_id, pw_hash, pw_salt, must_change, first_until, created_at) VALUES (?,?,?,?,?,?)').bind(id, p.hash, p.salt, 1, until, now.toISOString()).run();
    await env.DB.prepare('DELETE FROM host_logins WHERE registry_id=?').bind(id).run();
    return json({ ok: true, nickname: pl.nickname, whatsapp: pl.whatsapp });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

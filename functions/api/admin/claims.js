import { isAdmin, json, unauthorized } from '../../_auth.js';
import { ensurePlayerTables, randomToken, sha256Hex, CLAIM_MINUTES, PENDING_HOURS } from '../../_playeraccount.js';

// GET /api/admin/claims (admin): players who asked to edit their profile, and who already has a login.
// POST { action: send | cancel | reset | clearprofile, id } (admin)
//   send: makes the one-time link for a request and returns it with the message to send. It is shown once: only a hash is kept.
//   reset: forgets a player's password and sign-ins (they claim their page again).   clearprofile: removes the avatar, tags and bio (a bio is public text).
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await ensurePlayerTables(env);
    const now = new Date(), old = new Date(now.getTime() - PENDING_HOURS * 3600 * 1000).toISOString();
    await env.DB.prepare("UPDATE player_claims SET status='expired' WHERE status='pending' AND created_at<?").bind(old).run();
    await env.DB.prepare("UPDATE player_claims SET status='expired' WHERE status='sent' AND expires_at<?").bind(now.toISOString()).run();
    const rows = await env.DB.prepare("SELECT c.id, c.registry_id, c.status, c.created_at, c.sent_at, c.expires_at, r.nickname, r.whatsapp FROM player_claims c JOIN registry r ON r.id = c.registry_id WHERE c.status IN ('pending','sent') ORDER BY c.created_at ASC").all();
    const acc = await env.DB.prepare('SELECT a.registry_id AS id, a.last_login, r.nickname FROM player_accounts a JOIN registry r ON r.id = a.registry_id').all();
    return json({
      claims: rows.results.map(function (c) { return { id: c.id, playerId: c.registry_id, nickname: c.nickname, whatsapp: c.whatsapp || '', status: c.status, createdAt: c.created_at, sentAt: c.sent_at || null, expiresAt: c.expires_at || null }; }),
      accounts: acc.results.map(function (a) { return { id: a.id, nickname: a.nickname, lastLogin: a.last_login || null }; }).sort(function (a, b) { return a.nickname.toLowerCase() < b.nickname.toLowerCase() ? -1 : 1; }),
      linkMinutes: CLAIM_MINUTES,
    });
  } catch (err) { return json({ error: String(err) }, 500); }
}
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await ensurePlayerTables(env);
    let b; try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
    const action = b && b.action, id = String((b && b.id) || '');
    if (action === 'send') {
      const c = await env.DB.prepare("SELECT c.id, c.registry_id, c.status, r.nickname, r.whatsapp FROM player_claims c JOIN registry r ON r.id = c.registry_id WHERE c.id=?").bind(id).first();
      if (!c || (c.status !== 'pending' && c.status !== 'sent')) return json({ error: 'That request is not open any more.' }, 404);
      if (!String(c.whatsapp || '').replace(/\D/g, '')) return json({ error: 'Add a WhatsApp number for ' + c.nickname + ' first.' }, 400);
      const token = randomToken(), now = new Date(), exp = new Date(now.getTime() + CLAIM_MINUTES * 60000);
      await env.DB.prepare("UPDATE player_claims SET token_hash=?, status='sent', sent_at=?, expires_at=? WHERE id=?").bind(await sha256Hex(token), now.toISOString(), exp.toISOString(), c.id).run();
      const url = new URL(request.url).origin + '/claim?t=' + token;
      const message = 'Hi ' + c.nickname + ', tap the link to set the password of your Tiles by Tiles profile:\n' + url + '\n\nIt works once and expires in ' + CLAIM_MINUTES + ' minutes. If it was not you, ignore this message.';
      return json({ ok: true, nickname: c.nickname, whatsapp: c.whatsapp, url: url, message: message, expiresAt: exp.toISOString() });
    }
    if (action === 'cancel') { await env.DB.prepare("UPDATE player_claims SET status='cancelled' WHERE id=? AND status IN ('pending','sent')").bind(id).run(); return json({ ok: true }); }
    if (action === 'reset') {
      const pl = await env.DB.prepare('SELECT id FROM registry WHERE id=?').bind(id).first(); if (!pl) return json({ error: 'Player not found' }, 404);
      await env.DB.prepare('DELETE FROM player_accounts WHERE registry_id=?').bind(id).run(); await env.DB.prepare('DELETE FROM player_logins WHERE registry_id=?').bind(id).run();
      return json({ ok: true });
    }
    if (action === 'clearprofile') { await env.DB.prepare('DELETE FROM player_profiles WHERE registry_id=?').bind(id).run(); return json({ ok: true }); }
    return json({ error: 'Unknown action' }, 400);
  } catch (err) { return json({ error: String(err) }, 500); }
}

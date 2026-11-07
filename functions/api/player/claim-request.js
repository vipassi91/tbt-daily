import { respond, ensurePlayerTables, ipKey, addEvent, countEvents, maskWhatsapp } from '../../_playeraccount.js';
import { genCode } from '../../_auth.js';

// POST /api/player/claim-request { id }: someone on a player's page asks to edit that profile.
// Nothing is sent from here. The request waits for the admin, who sends a one-time link to the WhatsApp number the player registered with.
// Whoever presses the button never sees the link: it goes to the number on file, so pressing it for somebody else's page gets them nothing.
export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get('x-tbt') !== 'player') return respond({ error: 'Not allowed' }, 403);
    await ensurePlayerTables(env);
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const id = String((b && b.id) || '');
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(id)) return respond({ error: 'Player not found' }, 404);
    const ip = await ipKey(request);
    if ((await countEvents(env, 'claimreq-ip', ip, 3600000)) >= 10) return respond({ error: 'too_many' }, 429);
    await addEvent(env, 'claimreq-ip', ip);
    const pl = await env.DB.prepare('SELECT id, nickname, whatsapp, hidden FROM registry WHERE id=?').bind(id).first();
    if (!pl || pl.hidden) return respond({ error: 'Player not found' }, 404);
    const masked = maskWhatsapp(pl.whatsapp);
    if (!masked) return respond({ error: 'no_whatsapp' }, 409);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM player_claims WHERE registry_id=? AND created_at>?').bind(id, since).first();
    if (n && n.n >= 3) return respond({ error: 'too_many' }, 429);
    await env.DB.prepare("UPDATE player_claims SET status='cancelled' WHERE registry_id=? AND status IN ('pending','sent')").bind(id).run();   // a new request replaces the older ones
    await env.DB.prepare('INSERT INTO player_claims (id, registry_id, status, created_at) VALUES (?,?,?,?)').bind(genCode(12), id, 'pending', new Date().toISOString()).run();
    return respond({ ok: true, masked: masked });
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}

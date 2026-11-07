import { json } from '../_auth.js';
import { nameKey, cleanText, normWhatsapp, normInstagram, loadRegistry, loadSignup, gatherNames, seatRecords, ipHash, MAX_PENDING, RATE_PER_HOUR } from '../_players.js';

// Public sign-up by link. Everything here is gated by the secret token in the link (or, when the admin has opened sign-up to everyone,
// by nothing but the admin's switch), and nothing submitted shows anywhere until the admin approves it. Answers never include anybody's details.
async function openFor(env, token) {
  const sg = await loadSignup(env);
  const reg = await loadRegistry(env);
  const live = sg.ready && reg.ready && sg.enabled;
  const withLink = !!(live && sg.token && token === sg.token);
  return { ok: !!(live && (sg.open || withLink)), link: withLink, sg: sg, reg: reg };
}

// GET /api/signup?status=1 -> { open }: is sign-up open to everyone (the menu shows Sign up only then). Nothing else is said.
// GET /api/signup?t=TOKEN -> { open, names }: the names people already used at tables and are not registered yet.
// Those names are only given to whoever has the secret link: when sign-up is open to everyone the list is empty.
export async function onRequestGet({ request, env }) {
  try {
    const u = new URL(request.url);
    if (u.searchParams.get('status') === '1') {
      const sg = await loadSignup(env);
      return new Response(JSON.stringify({ open: !!(sg.ready && sg.enabled && sg.open) }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=60', 'X-Content-Type-Options': 'nosniff' } });
    }
    const t = u.searchParams.get('t') || '';
    const o = await openFor(env, t);
    if (!o.ok) return json({ open: false });
    if (!o.link) return json({ open: true, names: [] });
    const { typed } = await gatherNames(env);
    const seen = new Set(), names = [];
    seatRecords(o.reg, typed).forEach(function (r) { if (!r.owner && !seen.has(r.typedKey)) { seen.add(r.typedKey); names.push(r.typedName); } });
    names.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
    return json({ open: true, names: names });
  } catch (err) {
    return json({ open: false });
  }
}

// POST /api/signup { t, nickname, fullName, whatsapp, instagram, tableName, consent, website }
export async function onRequestPost({ request, env }) {
  try {
    let b;
    try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
    const o = await openFor(env, String(b && b.t || ''));
    if (!o.ok) return json({ error: 'This sign-up link is not valid or has been closed.' }, 403);
    if (b.website) return json({ ok: true });                       // a hidden field only a bot fills in
    if (b.consent !== true) return json({ error: 'Please tick the consent box first.' }, 400);
    const nickname = cleanText(b.nickname, 30);
    if (!nickname) return json({ error: 'Nickname is required.' }, 400);
    const wa = normWhatsapp(b.whatsapp);
    if (!wa) return json({ error: wa === null ? 'WhatsApp number is not valid.' : 'WhatsApp number is required.' }, 400);
    const ig = normInstagram(b.instagram);
    if (ig === null) return json({ error: 'Instagram username is not valid.' }, 400);
    const full = cleanText(b.fullName, 60), tableName = cleanText(b.tableName, 40);

    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM registry_requests').first();
    if (total.n >= MAX_PENDING) return json({ error: 'Sign-ups are full right now. Please contact the admin.' }, 429);
    const hash = await ipHash(request, o.sg.token || 'open');
    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM registry_requests WHERE ip_hash=? AND created_at>?').bind(hash, since).first();
    if (recent.n >= RATE_PER_HOUR) return json({ error: 'Too many attempts. Please try again later.' }, 429);

    const dupe = await env.DB.prepare('SELECT 1 AS x FROM registry WHERE whatsapp=? UNION SELECT 1 FROM registry_requests WHERE whatsapp=?').bind(wa, wa).first();
    if (dupe) return json({ error: 'This WhatsApp number is already registered or waiting for approval.' }, 409);
    if (o.reg.names.has(nameKey(nickname))) return json({ error: 'This nickname is already used by another player. Try another one.' }, 409);

    await env.DB.prepare('INSERT INTO registry_requests (id, nickname, full_name, whatsapp, instagram, table_name, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID().replace(/-/g, '').slice(0, 10), nickname, full || null, wa, ig || null, tableName || null, hash, new Date().toISOString()).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Something went wrong. Please try again later.' }, 500);
  }
}

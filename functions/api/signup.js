import { json } from '../_auth.js';
import { nameKey, cleanText, normWhatsapp, normInstagram, loadRegistry, loadSignup, gatherNames, ipHash, MAX_PENDING, RATE_PER_HOUR } from '../_players.js';

// Public sign-up by link. Everything here is gated by the secret token in the link, and nothing submitted
// shows anywhere until the admin approves it. Answers never include anybody's details.
async function openFor(env, token) {
  const sg = await loadSignup(env);
  const reg = await loadRegistry(env);
  const ok = sg.ready && reg.ready && sg.enabled && sg.token && token === sg.token;
  return { ok: !!ok, sg: sg, reg: reg };
}

// GET /api/signup?t=TOKEN -> { open, names }: the names people already used at tables and are not registered yet.
export async function onRequestGet({ request, env }) {
  try {
    const t = new URL(request.url).searchParams.get('t') || '';
    const o = await openFor(env, t);
    if (!o.ok) return json({ open: false });
    const { typed } = await gatherNames(env);
    const names = Array.from(typed.values()).filter(function (w) { return !o.reg.names.has(w.key); })
      .map(function (w) { return w.latestName; }).sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
    return json({ open: true, names: names });
  } catch (err) {
    return json({ open: false });
  }
}

// POST /api/signup { t, nickname, fullName, whatsapp, instagram, tableName, consent, website }
export async function onRequestPost({ request, env }) {
  try {
    let b;
    try { b = await request.json(); } catch (e) { return json({ error: 'Data tidak valid' }, 400); }
    const o = await openFor(env, String(b && b.t || ''));
    if (!o.ok) return json({ error: 'Link pendaftaran tidak berlaku atau sudah ditutup.' }, 403);
    if (b.website) return json({ ok: true });                       // a hidden field only a bot fills in
    if (b.consent !== true) return json({ error: 'Centang persetujuan dulu.' }, 400);
    const nickname = cleanText(b.nickname, 30);
    if (!nickname) return json({ error: 'Nama panggilan wajib diisi.' }, 400);
    const wa = normWhatsapp(b.whatsapp);
    if (!wa) return json({ error: wa === null ? 'Nomor WhatsApp tidak valid.' : 'Nomor WhatsApp wajib diisi.' }, 400);
    const ig = normInstagram(b.instagram);
    if (ig === null) return json({ error: 'Username Instagram tidak valid.' }, 400);
    const full = cleanText(b.fullName, 60), tableName = cleanText(b.tableName, 40);

    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM registry_requests').first();
    if (total.n >= MAX_PENDING) return json({ error: 'Pendaftaran sedang penuh. Hubungi admin.' }, 429);
    const hash = await ipHash(request, o.sg.token);
    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM registry_requests WHERE ip_hash=? AND created_at>?').bind(hash, since).first();
    if (recent.n >= RATE_PER_HOUR) return json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, 429);

    const dupe = await env.DB.prepare('SELECT 1 AS x FROM registry WHERE whatsapp=? UNION SELECT 1 FROM registry_requests WHERE whatsapp=?').bind(wa, wa).first();
    if (dupe) return json({ error: 'Nomor WhatsApp ini sudah terdaftar atau sedang menunggu persetujuan.' }, 409);
    if (o.reg.names.has(nameKey(nickname))) return json({ error: 'Nama panggilan ini sudah dipakai pemain lain. Coba nama lain.' }, 409);

    await env.DB.prepare('INSERT INTO registry_requests (id, nickname, full_name, whatsapp, instagram, table_name, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID().replace(/-/g, '').slice(0, 10), nickname, full || null, wa, ig || null, tableName || null, hash, new Date().toISOString()).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Terjadi kesalahan. Coba lagi nanti.' }, 500);
  }
}

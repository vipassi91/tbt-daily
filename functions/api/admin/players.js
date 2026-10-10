import { isAdmin, json, unauthorized } from '../../_auth.js';
import { nameKey, cleanText, normWhatsapp, normInstagram, loadRegistry, guestRuleOn, gatherNames, sameTableConflict, looksLikeTwo, similarRegistered, ensureRegistryTables, loadSignup, REGISTRY_SQL } from '../../_players.js';

// GET /api/admin/players (admin): the registered players (with their private details) and the guests.
// Works before the registry tables exist, so it doubles as an audit of the names in use.
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const reg = await loadRegistry(env);
    const { typed, played } = await gatherNames(env);
    const keysOf = {};
    reg.names.forEach(function (id, k) { (keysOf[id] = keysOf[id] || []).push(k); });
    const registered = Array.from(reg.players.values()).map(function (pl) {
      let games = 0, first = '', last = '';
      const spellings = {};
      (keysOf[pl.id] || []).forEach(function (k) {
        const w = typed.get(k);
        if (!w) return;
        games += w.games;
        if (w.first && (!first || w.first < first)) first = w.first;
        if (w.last > last) last = w.last;
        Object.keys(w.variants).forEach(function (n) { spellings[n] = (spellings[n] || 0) + w.variants[n]; });
      });
      return {
        id: pl.id, fullName: pl.fullName, nickname: pl.nickname, whatsapp: pl.whatsapp, instagram: pl.instagram,
        names: (keysOf[pl.id] || []).slice().sort(), games: games, first: first, last: last,
        incomplete: !pl.fullName || !pl.whatsapp,
      };
    }).sort(function (a, b) { return a.nickname.toLowerCase() < b.nickname.toLowerCase() ? -1 : 1; });
    const similar = similarRegistered(reg, typed);
    const guests = Array.from(typed.values()).filter(function (w) { return !reg.names.has(w.key); }).map(function (w) {
      return { key: w.key, name: w.latestName, games: w.games, last: w.last, two: looksLikeTwo(w.key), similar: similar[w.key] || [] };
    }).sort(function (a, b) { return b.games - a.games || (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1); });
    const sg = await loadSignup(env);
    let requests = [];
    if (sg.ready) {
      const rs = await env.DB.prepare('SELECT id, nickname, full_name, whatsapp, instagram, table_name, created_at FROM registry_requests ORDER BY created_at ASC').all();
      requests = rs.results.map(function (x) {
        const tk = x.table_name ? nameKey(x.table_name) : '';
        const w = tk ? typed.get(tk) : null;
        const owner = function (k) { const p = k && reg.players.get(reg.names.get(k)); return p ? p.nickname : null; };
        return {
          id: x.id, nickname: x.nickname, fullName: x.full_name || '', whatsapp: x.whatsapp, instagram: x.instagram || '', tableName: x.table_name || '', createdAt: x.created_at,
          claim: w ? { games: w.games, last: w.last } : null,
          claimTakenBy: owner(tk), nicknameTakenBy: owner(nameKey(x.nickname)),
        };
      });
    }
    return json({ ready: reg.ready, ruleOn: guestRuleOn(reg), registered: registered, guests: guests, played: played, sql: reg.ready ? null : REGISTRY_SQL,
      signup: { ready: sg.ready, enabled: sg.enabled, token: sg.token, requests: requests } });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

function newId() { return crypto.randomUUID().replace(/-/g, '').slice(0, 10); }

// Reads and validates the person fields of a request. `partial` leaves out fields that were not sent.
function readFields(body, partial) {
  const out = {};
  if (!partial || body.nickname !== undefined) { out.nickname = cleanText(body.nickname, 30); if (!out.nickname) return { error: 'Nama panggilan wajib diisi' }; }
  if (!partial || body.fullName !== undefined) out.fullName = cleanText(body.fullName, 60);
  if (!partial || body.whatsapp !== undefined) { out.whatsapp = normWhatsapp(body.whatsapp); if (out.whatsapp === null) return { error: 'Nomor WhatsApp tidak valid' }; }
  if (!partial || body.instagram !== undefined) { out.instagram = normInstagram(body.instagram); if (out.instagram === null) return { error: 'Username Instagram tidak valid' }; }
  return { fields: out };
}

// POST /api/admin/players (admin): setup | register | registerAll | update | addname | removename | remove
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'Data tidak valid' }, 400); }
    const action = body && body.action;
    if (action === 'setup') { await ensureRegistryTables(env); return json({ ok: true }); }

    const reg = await loadRegistry(env);
    if (!reg.ready) return json({ error: 'setup_needed', message: 'Aktifkan database pemain dulu.' }, 409);
    const now = new Date().toISOString();
    const owner = function (key) { const pl = reg.players.get(reg.names.get(key)); return pl ? pl.nickname : null; };

    // keys must be free (or already this person's) and must not have sat at one table
    async function checkKeys(keys, id) {
      for (const k of keys) {
        if (!k) return 'Nama tidak boleh kosong';
        const o = reg.names.get(k);
        if (o && o !== id) return '"' + k + '" sudah terdaftar atas nama ' + owner(k) + '.';
      }
      const { typed } = await gatherNames(env);
      const mine = id ? Array.from(reg.names.entries()).filter(function (e) { return e[1] === id; }).map(function (e) { return e[0]; }) : [];
      return sameTableConflict(typed, Array.from(new Set(mine.concat(keys))));
    }
    async function insertPlayer(id, f, keys) {
      try {
        await env.DB.prepare('INSERT INTO registry (id, full_name, nickname, whatsapp, instagram, created_at, updated_at) VALUES (?,?,?,?,?,?,?)').bind(id, f.fullName || null, f.nickname, f.whatsapp || null, f.instagram || null, now, now).run();
      } catch (e) {
        if (/UNIQUE/i.test(String(e)) && f.whatsapp) {
          const other = await env.DB.prepare('SELECT nickname FROM registry WHERE whatsapp=?').bind(f.whatsapp).first();
          return 'Nomor WhatsApp ini sudah dipakai ' + (other ? other.nickname : 'pemain lain') + '.';
        }
        throw e;
      }
      for (const k of keys) await env.DB.prepare('INSERT INTO registry_names (name_key, registry_id, created_at) VALUES (?,?,?)').bind(k, id, now).run();
      return null;
    }

    if (action === 'register') {
      const r = readFields(body, false); if (r.error) return json({ error: r.error }, 400);
      const f = r.fields;
      const keys = Array.from(new Set([nameKey(f.nickname), f.fullName ? nameKey(f.fullName) : null, body.fromGuest ? nameKey(body.fromGuest) : null].concat((Array.isArray(body.names) ? body.names : []).map(nameKey)).filter(Boolean)));
      const bad = await checkKeys(keys, null); if (bad) return json({ error: bad }, 409);
      const id = newId();
      const dup = await insertPlayer(id, f, keys); if (dup) return json({ error: dup }, 409);
      return json({ ok: true, id: id });
    }

    if (action === 'registerAll') {
      const { typed } = await gatherNames(env);
      const only = Array.isArray(body.keys) ? new Set(body.keys.map(nameKey)) : null;
      let created = 0, skippedTwo = 0, skippedOther = 0;
      for (const w of typed.values()) {
        if (reg.names.has(w.key) || (only && !only.has(w.key))) continue;
        if (looksLikeTwo(w.key)) { skippedTwo++; continue; }
        const nickname = cleanText(w.latestName, 30);
        if (!nickname || reg.names.has(nameKey(nickname))) { skippedOther++; continue; }
        const dup = await insertPlayer(newId(), { nickname: nickname }, [w.key]);
        if (!dup) { created++; reg.names.set(w.key, 'x'); } else skippedOther++;
      }
      return json({ ok: true, created: created, skippedTwo: skippedTwo, skippedOther: skippedOther });
    }

    if (action === 'signupEnable' || action === 'signupDisable' || action === 'signupReset') {
      const sg = await loadSignup(env);
      if (!sg.ready) return json({ error: 'setup_needed', message: 'Aktifkan pendaftaran lewat link dulu.' }, 409);
      const put = function (k, v) { return env.DB.prepare('INSERT INTO registry_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, v).run(); };
      if (action === 'signupDisable') await put('signup_enabled', '0');
      else {
        if (action === 'signupReset' || !sg.token) await put('signup_token', crypto.randomUUID().replace(/-/g, ''));
        if (action === 'signupEnable') await put('signup_enabled', '1');   // a new link keeps the on/off state
      }
      return json({ ok: true });
    }

    if (action === 'requestApprove' || action === 'requestReject') {
      const sg = await loadSignup(env);
      if (!sg.ready) return json({ error: 'setup_needed', message: 'Aktifkan pendaftaran lewat link dulu.' }, 409);
      const rq = await env.DB.prepare('SELECT id, nickname, full_name, whatsapp, instagram, table_name FROM registry_requests WHERE id=?').bind(String(body.id || '')).first();
      if (!rq) return json({ error: 'Pendaftaran tidak ditemukan' }, 404);
      if (action === 'requestReject') { await env.DB.prepare('DELETE FROM registry_requests WHERE id=?').bind(rq.id).run(); return json({ ok: true }); }
      const pick = function (v, d) { return v !== undefined ? v : d; };
      const r = readFields({ nickname: pick(body.nickname, rq.nickname), fullName: pick(body.fullName, rq.full_name), whatsapp: pick(body.whatsapp, rq.whatsapp), instagram: pick(body.instagram, rq.instagram) }, false);
      if (r.error) return json({ error: r.error }, 400);
      const f = r.fields;
      const keys = Array.from(new Set([nameKey(f.nickname), f.fullName ? nameKey(f.fullName) : null, rq.table_name ? nameKey(rq.table_name) : null].filter(Boolean)));
      const bad = await checkKeys(keys, null); if (bad) return json({ error: bad }, 409);
      const pid = newId();
      const dup = await insertPlayer(pid, f, keys); if (dup) return json({ error: dup }, 409);
      await env.DB.prepare('DELETE FROM registry_requests WHERE id=?').bind(rq.id).run();   // the details now live in the registry
      return json({ ok: true, id: pid });
    }

    const id = String(body.id || '');
    const pl = reg.players.get(id);
    if (!pl) return json({ error: 'Pemain tidak ditemukan' }, 400);

    if (action === 'update') {
      const r = readFields(body, true); if (r.error) return json({ error: r.error }, 400);
      const f = Object.assign({ nickname: pl.nickname, fullName: pl.fullName, whatsapp: pl.whatsapp, instagram: pl.instagram }, r.fields);
      const keys = [nameKey(f.nickname)].concat(f.fullName ? [nameKey(f.fullName)] : []);
      const bad = await checkKeys(keys, id); if (bad) return json({ error: bad }, 409);
      try {
        await env.DB.prepare('UPDATE registry SET full_name=?, nickname=?, whatsapp=?, instagram=?, updated_at=? WHERE id=?').bind(f.fullName || null, f.nickname, f.whatsapp || null, f.instagram || null, now, id).run();
      } catch (e) {
        if (/UNIQUE/i.test(String(e))) {
          const other = await env.DB.prepare('SELECT nickname FROM registry WHERE whatsapp=?').bind(f.whatsapp).first();
          return json({ error: 'Nomor WhatsApp ini sudah dipakai ' + (other ? other.nickname : 'pemain lain') + '.' }, 409);
        }
        throw e;
      }
      for (const k of keys) await env.DB.prepare('INSERT OR IGNORE INTO registry_names (name_key, registry_id, created_at) VALUES (?,?,?)').bind(k, id, now).run();
      return json({ ok: true });
    }

    if (action === 'addname') {
      const k = nameKey(body.name);
      const bad = await checkKeys([k], id); if (bad) return json({ error: bad }, 409);
      await env.DB.prepare('INSERT OR IGNORE INTO registry_names (name_key, registry_id, created_at) VALUES (?,?,?)').bind(k, id, now).run();
      return json({ ok: true });
    }

    if (action === 'removename') {
      const k = nameKey(body.key);
      if (reg.names.get(k) !== id) return json({ error: 'Ejaan tidak dikenali' }, 400);
      if (k === nameKey(pl.nickname)) return json({ error: 'Nama panggilan tidak bisa dihapus. Ubah dulu nama panggilannya.' }, 400);
      await env.DB.prepare('DELETE FROM registry_names WHERE name_key=?').bind(k).run();
      return json({ ok: true });
    }

    if (action === 'remove') {
      await env.DB.prepare('DELETE FROM registry_names WHERE registry_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM registry WHERE id=?').bind(id).run();
      return json({ ok: true });
    }

    return json({ error: 'Aksi tidak dikenal' }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

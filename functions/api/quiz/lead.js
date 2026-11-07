import { json } from '../../_auth.js';
import { cleanText, normWhatsapp, normInstagram } from '../../_players.js';
import { ipKey, addEvent, countEvents } from '../../_hostauth.js';
import { ensureQuizTables, QUIZ_TILES } from '../../_quiz.js';

// POST /api/quiz/lead { name, instagram, city, whatsapp, invite, tile, website }
// Sent by the quiz page when someone asks for their tile. Nothing is given back except ok. One row per Instagram username.
export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get('x-tbt') !== 'quiz') return json({ error: 'Not allowed' }, 403);
    await ensureQuizTables(env);
    let b; try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
    if (b && b.website) return json({ ok: true });                       // a hidden field only a bot fills in
    const ip = await ipKey(request);
    if ((await countEvents(env, 'quizlead', ip, 3600000)) >= 10) return json({ error: 'Too many tries. Please try again later.' }, 429);
    await addEvent(env, 'quizlead', ip);
    const name = cleanText(b && b.name, 60), city = cleanText(b && b.city, 60), ig = normInstagram(b && b.instagram), wa = normWhatsapp(b && b.whatsapp);
    if (name.length < 2) return json({ error: 'Name is required.' }, 400);
    if (!ig) return json({ error: 'Instagram username is not valid.' }, 400);
    if (city.length < 2) return json({ error: 'City is required.' }, 400);
    if (wa === null) return json({ error: 'WhatsApp number is not valid.' }, 400);
    if (QUIZ_TILES.indexOf(String(b && b.tile)) < 0) return json({ error: 'Unknown tile.' }, 400);
    const now = new Date().toISOString(), key = ig.toLowerCase();
    await env.DB.prepare('INSERT INTO quiz_leads (id, name, instagram, city, whatsapp, invite, tile, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(instagram) DO UPDATE SET name=excluded.name, city=excluded.city, whatsapp=excluded.whatsapp, invite=excluded.invite, tile=excluded.tile, updated_at=excluded.updated_at')
      .bind(crypto.randomUUID().replace(/-/g, '').slice(0, 10), name, key, city, wa || '', b && b.invite === false ? 0 : 1, String(b.tile), now, now).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Something went wrong. Please try again later.' }, 500);
  }
}

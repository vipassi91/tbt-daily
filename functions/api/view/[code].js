import { json } from '../../_auth.js';
import { safeDisplay } from '../../_players.js';
import { guessBlocked, guessMiss, tooManyGuesses } from '../../_hostauth.js';

// GET /api/view/:code: what players open. The view code only ever allows reading.
export async function onRequestGet({ request, env, params }) {
  if (await guessBlocked(request)) return tooManyGuesses();
  try {
    const t = await env.DB.prepare(
      'SELECT t.id, t.label, t.players, t.rounds, t.updated_at, d.label AS day_label, d.date AS day_date FROM tables t JOIN days d ON d.id = t.day_id WHERE t.view_code=?'
    ).bind(params.code.toUpperCase()).first();
    if (!t) { if (await guessMiss(env, request)) return tooManyGuesses(); return json({ error: 'Link not found' }, 404); }
    const game = JSON.parse(t.rounds);
    let stored = []; try { stored = JSON.parse(t.players); } catch (e) { stored = []; }
    return json({ label: t.label, dayLabel: t.day_label, dayDate: t.day_date, updatedAt: t.updated_at, game: game, display: await safeDisplay(env, t.id, game.names, stored) });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

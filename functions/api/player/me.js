import { respond, requirePlayer } from '../../_playeraccount.js';

// GET /api/player/me: who is signed in on this phone (nobody is a normal answer, not an error)
export async function onRequestGet({ request, env }) {
  try {
    const g = await requirePlayer(request, env);
    if (g.res) return respond({ signedIn: false });
    return respond({ signedIn: true, id: g.player.id, nickname: g.player.nickname });
  } catch (err) { return respond({ signedIn: false }); }
}

import { respond, requirePlayer, cleanBio, cleanTags, AVATARS } from '../../_playeraccount.js';

// POST /api/player/profile { bio, tags, avatar }: the signed-in player edits their own profile. It is always their own: the id comes from the login, never from the request.
export async function onRequestPost({ request, env }) {
  try {
    const g = await requirePlayer(request, env); if (g.res) return g.res;
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const avatar = String((b && b.avatar) || '');
    if (avatar && AVATARS.indexOf(avatar) < 0) return respond({ error: 'Pick one of the characters.' }, 400);
    const bio = cleanBio(b && b.bio), tags = cleanTags(b && b.tags);
    await env.DB.prepare('INSERT INTO player_profiles (registry_id, bio, tags, avatar, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(registry_id) DO UPDATE SET bio=excluded.bio, tags=excluded.tags, avatar=excluded.avatar, updated_at=excluded.updated_at')
      .bind(g.player.id, bio, JSON.stringify(tags), avatar, new Date().toISOString()).run();
    return respond({ ok: true, profile: { bio: bio, tags: tags, avatar: avatar } });
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}

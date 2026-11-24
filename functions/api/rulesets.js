import { json } from '../_auth.js';
import { loadRules, modeList } from '../_rulesets.js';

// GET /api/rulesets: every saved version of every mode (the scoreboard needs them to score a table in the version it started with),
// plus the mode list. No secrets in here. Kept at Cloudflare for 30 seconds.
export async function onRequestGet({ env }) {
  try {
    const saved = await loadRules(env);
    const r = json(Object.assign({ saved: saved.map(function (x) { return { id: x.id, v: x.v, data: x.data }; }) }, modeList()));
    r.headers.set('Cache-Control', 'public, max-age=30');
    return r;
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

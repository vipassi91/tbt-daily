import { loadRules, modeList } from './_rulesets.js';

// GET /modes.js: the scoring modes as the admin set them on the Ruleset page, as a small script every page loads in its <head>.
//   window.TBT_MODES = { families, modes: [{ id, fam, name, short, order, hidden, events, unit, v }] }   (names and order for menus and labels)
//   TBTRules.setSaved([...])   (the saved versions themselves, used by the scoreboard; only when assets/js/rules.js is on the page)
// Kept 60 seconds in the browser and at Cloudflare. If anything fails the pages fall back to their built-in names.
export async function onRequestGet({ env }) {
  let body = '';
  try {
    const saved = await loadRules(env);
    const slim = saved.map(function (x) { return { id: x.id, v: x.v, data: x.data }; });
    body = 'window.TBT_MODES=' + JSON.stringify(modeList()).replace(/</g, '\\u003c') + ';\n'
      + 'if(window.TBTRules)window.TBTRules.setSaved(' + JSON.stringify(slim).replace(/</g, '\\u003c') + ');\n';
  } catch (e) { body = '/* modes not available: built-in names are used */\n'; }
  return new Response(body, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
}

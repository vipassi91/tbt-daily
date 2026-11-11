import { loadHome, headlineHtml, escHtml } from './_home.js';

// The home page (/). The page itself is index.html; before it is sent, the words the admin chose on admin-home.html
// are written into it (the title, the description for search engines and link previews, and the headline), so search engines
// read them without running any script. The page script draws the same words from the copy put into #homeText.
//
// The leaderboard used to live here. Its old links carry the filters in the address (?p= ?m= ?tab= ?sesi=):
// those go on to /leaderboard with the same filters, so nothing that was shared stops working.
const OLD_LEADERBOARD = ['sesi', 'tab', 'p', 'm'];

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (OLD_LEADERBOARD.some(function (k) { return url.searchParams.has(k); })) {
    return Response.redirect(url.origin + '/leaderboard' + url.search, 301);
  }
  const res = await context.next();
  const type = res.headers.get('Content-Type') || '';
  if (res.status !== 200 || type.indexOf('text/html') < 0 || typeof HTMLRewriter === 'undefined') return res;

  let h;
  try { h = await loadHome(env); } catch (e) { return res; }
  const set = function (attr, value) { return { element: function (el) { el.setAttribute(attr, value); } }; };
  const html = function (value) { return { element: function (el) { el.setInnerContent(value, { html: true }); } }; };
  const json = JSON.stringify(h).replace(/</g, '\\u003c');
  const out = new HTMLRewriter()
    .on('title', { element: function (el) { el.setInnerContent(h.title); } })
    .on('meta[name="description"]', set('content', h.desc))
    .on('meta[property="og:title"]', set('content', h.title))
    .on('meta[property="og:description"]', set('content', h.desc))
    .on('meta[name="twitter:title"]', set('content', h.title))
    .on('meta[name="twitter:description"]', set('content', h.desc))
    .on('#homeText', html(json))
    .on('#seoKick', html(escHtml(h.kick)))
    .on('#seoH1', html(headlineHtml(h)))
    .on('#seoIntro', html(escHtml(h.intro)))
    .transform(res);
  // a page that carries words from the database is not kept by browsers for long: a change shows within a minute
  const headers = new Headers(out.headers);
  headers.set('Cache-Control', 'public, max-age=0, s-maxage=60');
  return new Response(out.body, { status: out.status, headers: headers });
}

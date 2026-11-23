import { ensureEventTables, loadEvents, slugOf, wibMs, ACTIVE } from '../_events.js';

// One event's page (/events/<id>/<name>). The page itself is events.html and draws the event with its script;
// before it is sent, the event's own title, description and address are written into its head, with the event data
// for search engines (schema.org Event). So a link shared on WhatsApp shows the event, and Google can list it.
// Anything that is not a published event (the list, a draft, a wrong id) is sent as it is.
const SITE = 'https://tilesbytiles.id';
const TYPE_NAME = { cls: 'Mahjong class', open: 'Mahjong open play', tour: 'Mahjong tournament', other: 'Mahjong event' };
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dateText(start) {
  const y = +start.slice(0, 4), m = +start.slice(5, 7) - 1, d = +start.slice(8, 10);
  return DAY[new Date(Date.UTC(y, m, d)).getUTCDay()] + ' ' + d + ' ' + MON[m] + ' ' + y + ', ' + start.slice(11, 16);
}
function rp(n) { return n ? 'Rp ' + Number(n).toLocaleString('id-ID') : 'Free'; }
function iso(ms) { return new Date(ms + 7 * 3600e3).toISOString().slice(0, 19) + '+07:00'; }

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const res = await context.next();
  const parts = [].concat(params.path || []);
  const type = res.headers.get('Content-Type') || '';
  if (!parts.length || res.status !== 200 || type.indexOf('text/html') < 0 || typeof HTMLRewriter === 'undefined') return res;
  let ev;
  try {
    await ensureEventTables(env);
    ev = (await loadEvents(env, "id = ? AND status = 'published'", [String(parts[0])]))[0];
  } catch (e) { return res; }
  if (!ev) return res;

  const now = Date.now();
  const future = ev.sessions.filter(function (s) { return wibMs(s.start) + s.hours * 3600e3 > now; });
  const shown = future.length ? future : ev.sessions;
  const url = SITE + '/events/' + ev.id + '/' + slugOf(ev.title);
  const prices = shown.map(function (s) { return s.price; }), low = prices.length ? Math.min.apply(null, prices) : 0;
  const when = shown.length ? dateText(shown[0].start) + (shown.length > 1 ? ' (+' + (shown.length - 1) + ' more session' + (shown.length > 2 ? 's' : '') + ')' : '') : '';
  const title = ev.title + ' | Tiles by Tiles';
  const place = ev.place ? ev.place : 'Surabaya';
  const desc = (TYPE_NAME[ev.type] || 'Mahjong event') + ' in Surabaya' + (when ? ', ' + when : '') + ' at ' + place + '. ' + (low ? 'From ' + rp(low) + '. ' : 'Free. ') + 'Book your seat online with Tiles by Tiles.';

  // schema.org: one Event per session (a session is one date)
  const ld = shown.map(function (s) {
    const start = wibMs(s.start), left = s.seats - s.taken;
    return {
      '@context': 'https://schema.org', '@type': 'Event', name: ev.title + (shown.length > 1 ? ' (' + dateText(s.start) + ')' : ''),
      description: ev.about ? ev.about.slice(0, 500) : desc, url: url,
      startDate: iso(start), endDate: iso(start + s.hours * 3600e3),
      eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: place, address: { '@type': 'PostalAddress', streetAddress: place, addressLocality: 'Surabaya', addressCountry: 'ID' } },
      organizer: { '@type': 'Organization', name: 'Tiles by Tiles', url: SITE },
      image: [SITE + '/og-image.jpg'],
      offers: { '@type': 'Offer', price: String(s.price), priceCurrency: 'IDR', url: url, availability: left > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut' }
    };
  });
  const ldText = JSON.stringify(ld.length === 1 ? ld[0] : ld).replace(/</g, '\\u003c');
  const set = function (attr, value) { return { element: function (el) { el.setAttribute(attr, value); } }; };
  const out = new HTMLRewriter()
    .on('title', { element: function (el) { el.setInnerContent(title); } })
    .on('meta[name="description"]', set('content', desc))
    .on('meta[property="og:title"]', set('content', title))
    .on('meta[property="og:description"]', set('content', desc))
    .on('meta[property="og:url"]', set('content', url))
    .on('meta[name="twitter:title"]', set('content', title))
    .on('meta[name="twitter:description"]', set('content', desc))
    .on('link[rel="canonical"]', set('href', url))
    .on('head', { element: function (el) { el.append('<script type="application/ld+json">' + ldText + '</script>', { html: true }); } })
    .transform(res);
  const headers = new Headers(out.headers);
  headers.set('Cache-Control', 'public, max-age=0, s-maxage=60');
  return new Response(out.body, { status: out.status, headers: headers });
}

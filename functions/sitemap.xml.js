import { ensureEventTables, loadEvents, slugOf, lastEnd } from './_events.js';

// /sitemap.xml: the fixed pages (sitemap.xml in the site folder) plus every published event page, so Google finds new events by itself.
// Events that ended more than 60 days ago are left out.
export async function onRequestGet(context) {
  const res = await context.next();
  if (res.status !== 200) return res;
  let xml = await res.text(), add = '';
  try {
    await ensureEventTables(context.env);
    const list = await loadEvents(context.env, "status = 'published'", []);
    const cut = Date.now() - 60 * 86400e3;
    list.filter(function (e) { return e.sessions.length && lastEnd(e) > cut; }).forEach(function (e) {
      const day = String(e.updatedAt || '').slice(0, 10);
      add += '  <url><loc>https://tilesbytiles.id/events/' + e.id + '/' + slugOf(e.title) + '</loc>' + (day ? '<lastmod>' + day + '</lastmod>' : '') + '<changefreq>daily</changefreq><priority>0.8</priority></url>\n';
    });
  } catch (e) { /* the fixed pages are still sent */ }
  if (add) xml = xml.replace('</urlset>', add + '</urlset>');
  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600' } });
}

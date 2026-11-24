// The old address (tilesbytilesleaderboard.pages.dev) sends every page to the same page on tilesbytiles.id with a permanent redirect (301),
// so old links and printed table QR codes keep working and search engines learn that tilesbytiles.id is the one address.
// Only page visits (GET and HEAD, outside /api/) move: a page already open on the old address can still finish what it is saving.
// Preview addresses (<id>.tilesbytilesleaderboard.pages.dev) are left alone, so a new version can still be tried before it goes live.
const OLD_HOST = 'tilesbytilesleaderboard.pages.dev', NEW_ORIGIN = 'https://tilesbytiles.id';
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  if (url.hostname === OLD_HOST && (request.method === 'GET' || request.method === 'HEAD') && url.pathname.indexOf('/api/') !== 0) {
    return new Response(null, { status: 301, headers: { Location: NEW_ORIGIN + url.pathname + url.search, 'Cache-Control': 'public, max-age=86400' } });
  }
  return context.next();
}

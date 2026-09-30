export function isAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const provided = auth.replace(/^Bearer\s+/i, '');
  return !!env.ADMIN_PASSWORD && provided === env.ADMIN_PASSWORD;
}
export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
export function unauthorized() { return json({ error: 'Password admin salah atau belum diisi' }, 401); }

function randChar() { return 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]; }
export function genCode(len = 5) { return Array.from({ length: len }, randChar).join(''); }

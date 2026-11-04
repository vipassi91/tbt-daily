export function isAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const provided = auth.replace(/^Bearer\s+/i, '');
  return !!env.ADMIN_PASSWORD && provided === env.ADMIN_PASSWORD;
}
export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function unauthorized() { return json({ error: 'The admin password is wrong or missing' }, 401); }

// Codes come from the secure random generator. The alphabet has 32 characters, which divides 256, so every character is equally likely.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function genCode(len = 5) { const a = new Uint8Array(len); crypto.getRandomValues(a); return Array.from(a, function (b) { return CODE_ALPHABET[b & 31]; }).join(''); }

import { ensureHostTables, ipKey, addEvent, countEvents } from '../_hostauth.js';
import { json } from '../_auth.js';

// Every /api request that carries the admin password (Authorization: Bearer ...) passes here first.
// A wrong password is counted per address; after 10 wrong tries in 15 minutes that address gets "too many tries"
// for every admin request (even with the right password) until the 15 minutes have passed. Requests without a password are untouched.
const WINDOW = 15 * 60 * 1000, MAX_WRONG = 10;
const blocked = new Map();   // address -> blocked until (ms): a blocked address costs no database query on this instance
export async function onRequest({ request, env, next }) {
  const auth = request.headers.get('Authorization') || '';
  const given = auth.replace(/^Bearer\s+/i, '');
  if (!/^Bearer\s+/i.test(auth) || !given) return next();
  let k = '';
  try {
    k = await ipKey(request);
    const until = blocked.get(k);
    if (until && until > Date.now()) return tooMany();
    if (until) blocked.delete(k);
    if (given !== env.ADMIN_PASSWORD) {
      await ensureHostTables(env);
      await addEvent(env, 'adminlogin', k);
      if ((await countEvents(env, 'adminlogin', k, WINDOW)) >= MAX_WRONG) { blocked.set(k, Date.now() + WINDOW); return tooMany(); }
    } else if (await countEvents(env, 'adminlogin', k, WINDOW) >= MAX_WRONG) {
      return tooMany();
    }
  } catch (e) { /* counting must never stop the site */ }
  return next();
}
function tooMany() { return json({ error: 'Too many wrong passwords. Try again in 15 minutes.' }, 429); }

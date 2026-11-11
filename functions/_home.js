// The words at the top of the home page, and what search engines show for it.
// The admin edits them on admin-home.html; they are kept in the table site_settings (made the first time they are saved).
// Until then, and whenever the database cannot be read, the defaults below are used, so the home page never breaks.

export const HOME_DEFAULT = {
  kick: 'Komunitas Mahjong Surabaya',
  l1: 'Play. Learn. Connect.',
  hl: 'Connect',
  l2: 'The mahjong community in Surabaya: classes, open play and tournaments.',
  intro: 'Start from your first tile in a beginner class, come back every week for open play, and see every game you play land on the TBT leaderboard.',
  title: 'Tiles by Tiles | Komunitas & Belajar Mahjong Surabaya',
  desc: 'Komunitas mahjong di Surabaya. Belajar mahjong dari nol di kelas pemula, main bareng tiap minggu dan ikut turnamen. Booking kursi online.'
};

// Hard limits (the admin page shows softer, recommended lengths and warns past them).
export const HOME_LIMITS = { kick: 60, l1: 60, hl: 30, l2: 110, intro: 320, title: 90, desc: 300 };
const KEYS = Object.keys(HOME_LIMITS);

function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }

// Takes whatever was sent and keeps only the known fields, cleaned and cut to length. Empty required fields fall back to the default.
export function cleanHome(b) {
  const out = {};
  KEYS.forEach(function (k) { out[k] = clean(b && b[k], HOME_LIMITS[k]); });
  ['l1', 'title', 'desc'].forEach(function (k) { if (!out[k]) out[k] = HOME_DEFAULT[k]; });
  return out;
}

// Kept for half a minute in this worker, so the home page does not read the database on every visit.
let memo = { at: 0, value: null };
export function forgetHome() { memo = { at: 0, value: null }; }

export async function loadHome(env) {
  if (memo.value && Date.now() - memo.at < 30000) return memo.value;
  let value = HOME_DEFAULT;
  try {
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'home_text'").first();
    if (row && row.value) value = cleanHome(Object.assign({}, HOME_DEFAULT, JSON.parse(row.value)));
  } catch (e) { value = HOME_DEFAULT; }   // no table yet, or the database is away: the defaults
  memo = { at: Date.now(), value: value };
  return value;
}

export async function saveHome(env, text) {
  const value = cleanHome(text);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)').run();
  await env.DB.prepare("INSERT INTO site_settings (key, value, updated_at) VALUES ('home_text', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify(value), new Date().toISOString()).run();
  forgetHome();
  return value;
}

export function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

// The headline as HTML: the red word in <em> (its first appearance, in the headline, otherwise in the second line),
// and the second line inside the same <h1> so search engines read both. The home page script draws it the same way.
export function headlineHtml(h) {
  const hl = h.hl ? escHtml(h.hl) : '';
  function mark(t) { const i = hl ? t.indexOf(hl) : -1; return i < 0 ? t : t.slice(0, i) + '<em>' + hl + '</em>' + t.slice(i + hl.length); }
  let l1 = escHtml(h.l1), l2 = escHtml(h.l2 || '');
  const m1 = mark(l1);
  if (m1 !== l1) l1 = m1; else l2 = mark(l2);
  return l1 + (l2 ? '<span class="h-h1s">' + l2 + '</span>' : '');
}

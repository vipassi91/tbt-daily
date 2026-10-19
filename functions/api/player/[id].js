// A registered player's own page: who they are and every game they played, with the statistics kept for each game.
// Public, with no login. A player who hid their page, an id nobody has, and a badly written id all get the very same
// answer, so nobody can find out who chose to hide.
import { json } from '../../_auth.js';
import { loadRegistryCached, seatOwner, nameKey } from '../../_players.js';
import { statsFor, summarizePlayers } from '../../_tables.js';

const NOT_AVAILABLE = function () { return json({ error: 'not_available' }, 404); };

export async function onRequestGet({ params, env }) {
  try {
    const id = String(params.id || '').toLowerCase();
    if (!/^[0-9a-f]{10}$/.test(id)) return NOT_AVAILABLE();
    const reg = await loadRegistryCached(env);
    const pl = reg.ready ? reg.players.get(id) : null;
    if (!pl || pl.hidden) return NOT_AVAILABLE();

    // the tables where this person sat, by the same rule the leaderboard uses (the name written, or a choice made for that seat)
    const rows = (await env.DB.prepare('SELECT id, day_id, label, players, view_code FROM tables').all()).results;
    const mine = [];
    rows.forEach(function (t) {
      let names = []; try { names = JSON.parse(t.players); } catch (e) { names = []; }
      names.forEach(function (n, seat) { if (n && seatOwner(reg, t.id, seat, nameKey(n)).id === id) mine.push({ t: t, seat: seat }); });
    });
    const days = {};
    (await env.DB.prepare('SELECT id, label, date FROM days').all()).results.forEach(function (d) { days[d.id] = d; });

    const games = [];
    for (let i = 0; i < mine.length; i += 40) {   // the database takes a limited number of values per question
      const part = mine.slice(i, i + 40), ids = part.map(function (m) { return m.t.id; });
      const full = (await env.DB.prepare('SELECT id, day_id, label, view_code, players, stats, rounds, updated_at FROM tables WHERE id IN (' + ids.map(function () { return '?'; }).join(',') + ')').bind(...ids).all()).results;
      const byId = {}; full.forEach(function (r) { byId[r.id] = r; });
      for (const m of part) {
        const row = byId[m.t.id]; if (!row) continue;
        const stats = await statsFor(env, row);   // renews an old table's statistics when its turn comes, so the facts are there
        if (!stats.events) continue;
        const me = summarizePlayers(stats)[m.seat], f = (stats.facts && stats.facts[stats.names[m.seat]]) || null;
        if (!me || !f) continue;
        const d = days[row.day_id] || {};
        games.push({
          view: row.view_code, table: row.label, session: d.label || '', date: d.date || '', mode: stats.mode || 'casual', locked: !!stats.locked,
          rank: me.rank, net: me.netTotal, hands: stats.hands, winds: stats.winds, won: f.won, windFirsts: f.windFirsts,
          ptsSum: f.ptsSum, best: f.best, zimo: f.zimo, dealIns: f.dealIns,
        });
      }
    }
    games.sort(function (a, b) { return b.date < a.date ? -1 : b.date > a.date ? 1 : (a.table < b.table ? -1 : 1); });
    return json({ player: { id: id, nickname: pl.nickname, since: (pl.createdAt || '').slice(0, 10) }, games: games });
  } catch (err) {
    return json({ error: 'server' }, 500);
  }
}

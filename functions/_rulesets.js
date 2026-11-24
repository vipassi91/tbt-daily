// Rulesets saved by the admin (the Ruleset page). Every save is a new version of one mode; the built-in modes are version 1
// (in assets/js/rules.js) and are never stored. The engine is told about the saved versions before any scoring happens:
// functions/api/_middleware.js calls loadRules for every /api request (kept for 20 seconds per server instance).
import { T } from './_scoring.js';

let ready = false, cachedAt = 0, cached = null;
const KEEP = 20 * 1000;
export async function ensureRulesets(env) {
  if (ready) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS rulesets (id TEXT NOT NULL, v INTEGER NOT NULL, data TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL, PRIMARY KEY (id, v))').run();
  ready = true;
}
export async function savedRules(env) {
  await ensureRulesets(env);
  const r = await env.DB.prepare('SELECT id, v, data, note, created_at FROM rulesets ORDER BY id, v').all();
  return (r.results || []).map(function (x) { let data = null; try { data = JSON.parse(x.data); } catch (e) { data = null; } return { id: x.id, v: x.v, data: data, note: x.note || '', at: x.created_at }; }).filter(function (x) { return x.data; });
}
export async function loadRules(env, force) {
  if (!force && cached && Date.now() - cachedAt < KEEP) return cached;
  try { cached = await savedRules(env); cachedAt = Date.now(); T.setSaved(cached); } catch (e) { if (!cached) T.setSaved([]); }
  return cached || [];
}
export function forgetRules() { cached = null; cachedAt = 0; }
// what the other pages need to show the modes: names, short labels, families and order (no rules)
export function modeList() {
  return { families: T.FAMILIES, modes: T.list(true).map(function (r) { return { id: r.id, fam: r.fam, name: r.name, short: r.short, order: r.order, hidden: !!r.hidden, events: r.events !== false, unit: r.unit, v: r.v }; }) };
}
// a new id for a copied sub-mode: letters of its name, made unique
export function newId(name) {
  let base = String(name || 'mode').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'mode', id = 'x' + base, k = 2;
  while (T.exists(id)) { id = 'x' + base + k; k++; }
  return id;
}

import { MAX_RESERVES, MAX_STARTERS, SQUAD_TYPES, cleanName, dedupeMembers, keyOf, memberIndex } from "@/lib/planner";

export function parsePower(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/\s+/g, "");
  if (!s) return null;
  const m = s.match(/^([\d.,]+)([kmbg]?)$/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,(?=\d{3}(\D|$))/g, "").replace(",", "."));
  if (Number.isNaN(n)) return null;
  const suf = m[2].toLowerCase();
  if (suf === "k") n /= 1000;
  else if (suf === "b" || suf === "g") n *= 1000;
  else if (!suf && n >= 10000) n /= 1e6;
  return Math.round(n * 100) / 100;
}

export function parseSquad(raw) {
  const s = (raw ?? "").toLowerCase();
  if (!s) return "";
  if (/tank/.test(s)) return "Tank";
  if (/air|plane|jet/.test(s)) return "Aircraft";
  if (/missil/.test(s)) return "Missile";
  if (/mix/.test(s)) return "Mixed";
  return SQUAD_TYPES.find((t) => t.toLowerCase() === s) ?? "";
}

// One member per line: "Name, 45.2M, Tank" / "Name<TAB>45200000" / "Name 45.2 Aircraft".
export function parseMemberLines(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    let parts = l.split(/\t|;|\||,(?!\d)/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 1) {
      const m = l.match(/^(.*?)[\s,]+([\d.,]+\s*[kKmMbBgG]?)(?:\s+(.+))?$/);
      parts = m ? [m[1], m[2], m[3] ?? ""] : [l];
    }
    const [name, ...rest] = parts;
    let power = null, squad = "";
    for (const r of rest) {
      if (power === null && parsePower(r) !== null) power = parsePower(r);
      else if (!squad) squad = parseSquad(r);
    }
    if (cleanName(name)) out.push({ name: cleanName(name), power, squad });
  }
  return dedupeMembers(out);
}

const powerOf = (idx, n) => Number(idx.get(keyOf(n))?.power) || 0;
export const totalPower = (names, members) => {
  const idx = memberIndex(members);
  return names.reduce((s, n) => s + powerOf(idx, n), 0);
};

const LIMITS = { starters: MAX_STARTERS, reserves: MAX_RESERVES };

function uniqueNames(names) {
  const seen = new Set();
  return names.filter((n) => {
    const k = keyOf(n);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// First roster list of a team that still has room, or null when the team is full.
function openList(roster) {
  if (roster.starters.length < MAX_STARTERS) return "starters";
  if (roster.reserves.length < MAX_RESERVES) return "reserves";
  return null;
}

// Players already on a team's building stay in that team; returns their keys.
function pinBuildingPlayers(teams, pool, res, tot, power) {
  const pinned = new Set();
  for (const t of ["A", "B"]) {
    const onBuildings = new Set(Object.values(teams[t].assignments).flatMap((a) => [a.leader, ...a.players]).map(keyOf));
    for (const n of pool.filter((x) => onBuildings.has(keyOf(x)))) {
      const list = openList(res[t]);
      if (pinned.has(keyOf(n)) || !list) continue;
      pinned.add(keyOf(n));
      res[t][list].push(n);
      if (list === "starters") tot[t] += power(n);
    }
  }
  return pinned;
}

// Each name goes to the side with less power; returns names that did not fit.
function fillGreedy(names, list, res, tot, power) {
  const left = [];
  for (const n of names) {
    const open = ["A", "B"].filter((t) => res[t][list].length < LIMITS[list]);
    if (!open.length) {
      left.push(n);
      continue;
    }
    open.sort((x, y) => tot[x] - tot[y] || res[x][list].length - res[y][list].length);
    res[open[0]][list].push(n);
    tot[open[0]] += power(n);
  }
  return left;
}

// Greedy balance by power: pinned building players first, then starters, then reserves.
export function proposeBalance(teams, members) {
  const idx = memberIndex(members);
  const power = (n) => powerOf(idx, n);
  const rosterNames = ["A", "B"].flatMap((t) => [...teams[t].starters, ...teams[t].reserves]);
  const pool = uniqueNames([...rosterNames, ...members.map((m) => m.name)]).sort((a, b) => power(b) - power(a));
  const res = { A: { starters: [], reserves: [] }, B: { starters: [], reserves: [] } };
  const tot = { A: 0, B: 0 };
  const pinned = pinBuildingPlayers(teams, pool, res, tot, power);
  const rest = pool.filter((n) => !pinned.has(keyOf(n)));
  const startersLeft = MAX_STARTERS * 2 - res.A.starters.length - res.B.starters.length;
  const afterStarters = fillGreedy(rest.slice(0, startersLeft), "starters", res, tot, power);
  const excluded = fillGreedy([...afterStarters, ...rest.slice(startersLeft)], "reserves", res, tot, power);
  return { rosters: res, totals: tot, excluded, poolSize: pool.length, pinned: pinned.size };
}

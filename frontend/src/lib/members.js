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

// Greedy balance: strongest go to the weaker side, starters first then reserves.
export function proposeBalance(teams, members) {
  const idx = memberIndex(members);
  const rosterNames = [...teams.A.starters, ...teams.A.reserves, ...teams.B.starters, ...teams.B.reserves];
  const seen = new Set();
  let pool = rosterNames.filter((n) => {
    const k = keyOf(n);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (pool.length < 2) pool = members.map((m) => m.name);
  const sorted = [...pool].sort((a, b) => powerOf(idx, b) - powerOf(idx, a));
  const res = { A: { starters: [], reserves: [] }, B: { starters: [], reserves: [] } };
  const tot = { A: 0, B: 0 };
  const fill = (names, list, max) => {
    const left = [];
    for (const n of names) {
      const open = ["A", "B"].filter((t) => res[t][list].length < max);
      if (!open.length) {
        left.push(n);
        continue;
      }
      open.sort((x, y) => tot[x] - tot[y] || res[x][list].length - res[y][list].length);
      res[open[0]][list].push(n);
      tot[open[0]] += powerOf(idx, n);
    }
    return left;
  };
  const afterStarters = fill(sorted.slice(0, MAX_STARTERS * 2), "starters", MAX_STARTERS);
  const excluded = fill([...afterStarters, ...sorted.slice(MAX_STARTERS * 2)], "reserves", MAX_RESERVES);
  return { rosters: res, totals: tot, excluded, poolSize: pool.length };
}

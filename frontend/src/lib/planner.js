import { useCallback, useEffect, useMemo, useRef, useState } from "react";


export const STAGE_W = 1000;
export const DEFAULT_MAP_SRC = "/Desert-map.png";
export const SECOND_MAP_SRC = " desert-map-V2.png";
export const DEFAULT_MAP_RATIO = 941 / 1672;
export const LAYOUT_VERSION = 11;
export const MAX_STARTERS = 20;
export const MAX_RESERVES = 10;


export const TEAMS = ["A", "B"];
export const teamTitle = (t) => `DESERT STORM TEAM ${t}`;
export const TEAM_COLOR = { A: "#3E7BE0", B: "#D9403A" };
export const SQUAD_TYPES = ["Tank", "Aircraft", "Missile", "Mixed"];
export const AVATAR_PRESETS = ["🎖️", "🪖", "🛡️", "⚔️", "🚀", "🔥", "⚡", "👑", "🦅", "🐺"];


export const STRUCTURES = [
  { id: "info_center", name: "Info Center" },
  { id: "arsenal", name: "Arsenal" },
  { id: "hospital_4", name: "Hospital-4" },
  { id: "oil_1", name: "Oil - Petrol -1" },
  { id: "silo", name: "Silo" },
  { id: "hospital_2", name: "Hospital-2" },
  { id: "hospital_1", name: "Hospital-1" },
  { id: "oil_2", name: "Oil - Petrol -2" },
  { id: "hospital_3", name: "Hospital-3" },
  { id: "mercenary", name: "Mercenary" },
  { id: "tech_center", name: "Tech center" },
];
export const STRUCTURE_BY_ID = Object.fromEntries(STRUCTURES.map((s) => [s.id, s]));


// Building centre + size, % of map width/height (calibrated on Desert-map.png 1672x941).
export const DEFAULT_HOTSPOTS = {
  info_center: { x: 34.8, y: 23.2, w: 10, h: 14 },
  arsenal: { x: 50.4, y: 23.8, w: 10.5, h: 17 },
  hospital_4: { x: 67.3, y: 23.0, w: 9, h: 13 },
  oil_1: { x: 23.4, y: 37.4, w: 9, h: 13 },
  silo: { x: 50.5, y: 51.4, w: 12, h: 14 },
  hospital_2: { x: 78.0, y: 36.4, w: 9, h: 13 },
  hospital_1: { x: 24.4, y: 63.6, w: 9, h: 13 },
  oil_2: { x: 75.8, y: 64.6, w: 9, h: 13 },
  hospital_3: { x: 32.5, y: 79.6, w: 9, h: 13 },
  mercenary: { x: 50.0, y: 77.0, w: 12, h: 15 },
  tech_center: { x: 67.3, y: 79.6, w: 9, h: 13 },
};


// Printed map labels, relative to the building centre (% of map).
export const MAP_LABELS = {
  info_center: { dx: -0.2, dy: 8.8, w: 10, h: 4.8 },
  arsenal: { dx: 0.2, dy: 11.5, w: 7, h: 4.8 },
  hospital_4: { dx: 0, dy: 9.0, w: 9.4, h: 4.8 },
  oil_1: { dx: -0.9, dy: 9.4, w: 11.2, h: 4.8 },
  silo: { dx: 0, dy: 8.4, w: 4, h: 4.8 },
  hospital_2: { dx: 0, dy: 9.0, w: 9.4, h: 4.8 },
  hospital_1: { dx: 0, dy: 9.2, w: 8.8, h: 4.8 },
  oil_2: { dx: 0.3, dy: 8.6, w: 11.2, h: 4.8 },
  hospital_3: { dx: -0.2, dy: 8.7, w: 9, h: 4.8 },
  mercenary: { dx: 0, dy: 11.2, w: 9.6, h: 4.8 },
  tech_center: { dx: -0.2, dy: 8.7, w: 10.4, h: 4.8 },
};


// Preferred nameplate side per building (Silo is auto-placed).
export const PLATE_SIDE = {
  oil_1: "left", hospital_1: "left",
  hospital_2: "right", oil_2: "right",
  hospital_3: "below", tech_center: "below",
  info_center: "above", hospital_4: "above", arsenal: "above", mercenary: "above",
};


export const emptyAssignment = () => ({ leader: "", players: [] });
const emptyTeam = () => ({ assignments: {}, starters: [], reserves: [] });


const STATE_KEY = "desert_storm_planner_state_v3";
const LEGACY_KEY = "desert_tactical_planner_state_v2";
const IMAGE_KEY = "desert_storm_planner_map_v3";


// localStorage wrapper: failures (private mode, quota) are logged, never thrown.
export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Could not read "${key}" from storage`, e);
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`Could not save "${key}" to storage`, e);
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Could not remove "${key}" from storage`, e);
    }
  },
};


export const cleanName = (s) => (s ?? "").trim();
export const keyOf = (s) => cleanName(s).toLowerCase();


export function dedupeNames(names) {
  const seen = new Map();
  for (const n of names) {
    const c = cleanName(n);
    if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
  }
  return [...seen.values()];
}


export function dedupeMembers(list) {
  const seen = new Map();
  for (const m of list) {
    const name = cleanName(m.name);
    if (!name) continue;
    const k = name.toLowerCase();
    const prev = seen.get(k);
    if (!prev) {
      seen.set(k, {
        name,
        power: m.power ?? null,
        squad: m.squad ?? "",
        avatar: m.avatar || "🎖️",
      });
    } else {
      seen.set(k, {
        ...prev,
        power: prev.power ?? m.power ?? null,
        squad: prev.squad || m.squad || "",
        avatar: (prev.avatar && prev.avatar !== "🎖️" ? prev.avatar : m.avatar) || "🎖️",
      });
    }
  }
  return [...seen.values()];
}


const normMember = (m) =>
  typeof m === "string"
    ? { name: m, power: null, squad: "", avatar: "🎖️" }
    : { name: m.name ?? "", power: m.power ?? null, squad: m.squad ?? "", avatar: m.avatar || "🎖️" };


function normTeam(t) {
  const assignments = {};
  for (const [id, a] of Object.entries(t?.assignments ?? {})) {
    if (STRUCTURE_BY_ID[id]) assignments[id] = { leader: a?.leader ?? "", players: Array.isArray(a?.players) ? a.players : [] };
  }
  return { assignments, starters: Array.isArray(t?.starters) ? t.starters : [], reserves: Array.isArray(t?.reserves) ? t.reserves : [] };
}


function loadState() {
  const base = {
    teams: { A: emptyTeam(), B: emptyTeam() },
    hotspots: { ...DEFAULT_HOTSPOTS },
    plateOffsets: {},
    layoutVersion: LAYOUT_VERSION,
    members: [],
    battle: { at: null, weekly: false },
  };
  const raw = storage.get(STATE_KEY) ?? storage.get(LEGACY_KEY);
  if (!raw) return base;
  try {
    const p = JSON.parse(raw);
    const sameLayout = p.layoutVersion === LAYOUT_VERSION;
    return {
      teams: { A: normTeam(p.teams?.A), B: normTeam(p.teams?.B) },
      hotspots: sameLayout ? { ...DEFAULT_HOTSPOTS, ...p.hotspots } : { ...DEFAULT_HOTSPOTS },
      plateOffsets: sameLayout ? { ...p.plateOffsets } : {},
      layoutVersion: LAYOUT_VERSION,
      members: dedupeMembers((Array.isArray(p.members) ? p.members : []).map(normMember)),
      battle: { at: p.battle?.at ?? null, weekly: p.battle?.weekly ?? false },
    };
  } catch (e) {
    console.warn("Saved planner data is corrupted, starting fresh", e);
    return base;
  }
}


const without = (list, name) => list.filter((n) => keyOf(n) !== keyOf(name));


export function usePlanner() {
  const [state, setState] = useState(loadState);
  const [savedAt, setSavedAt] = useState(null);
  const latest = useRef(state);
  latest.current = state;


  useEffect(() => {
    const t = setTimeout(() => {
      if (storage.set(STATE_KEY, JSON.stringify(state))) setSavedAt(new Date());
    }, 300);
    return () => clearTimeout(t);
  }, [state]);


  useEffect(() => {
    const flush = () => storage.set(STATE_KEY, JSON.stringify(latest.current));
    const onVis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);


  const updateTeam = useCallback((team, fn) => {
    setState((s) => ({ ...s, teams: { ...s.teams, [team]: fn(s.teams[team]) } }));
  }, []);


  const updateAssignment = useCallback(
    (team, id, fn) =>
      updateTeam(team, (t) => ({ ...t, assignments: { ...t.assignments, [id]: fn(t.assignments[id] ?? emptyAssignment()) } })),
    [updateTeam],
  );


  const actions = useMemo(
    () => ({
      setLeader: (team, id, leader) => updateAssignment(team, id, (a) => ({ ...a, leader })),
      addPlayers: (team, id, names) => updateAssignment(team, id, (a) => ({ ...a, players: [...a.players, ...names] })),
      removePlayer: (team, id, idx) => updateAssignment(team, id, (a) => ({ ...a, players: a.players.filter((_, i) => i !== idx) })),
      clearBuilding: (team, id) =>
        updateTeam(team, (t) => {
          const assignments = { ...t.assignments };
          delete assignments[id];
          return { ...t, assignments };
        }),
      clearTeam: (team) => updateTeam(team, () => emptyTeam()),
      // Adds to starters (or reserves when starters are full); returns where it went.
      ensureInRoster: (team, name) => {
        const t = latest.current.teams[team];
        const k = keyOf(name);
        if (!k || [...t.starters, ...t.reserves].some((n) => keyOf(n) === k)) return "present";
        if (t.starters.length < MAX_STARTERS) {
          updateTeam(team, (x) =>
            x.starters.length >= MAX_STARTERS || [...x.starters, ...x.reserves].some((n) => keyOf(n) === k)
              ? x
              : { ...x, starters: [...x.starters, cleanName(name)] },
          );
          return "starters";
        }
        return "full";
      },
      addToRoster: (team, list, names) =>
        updateTeam(team, (t) => {
          const max = list === "starters" ? MAX_STARTERS : MAX_RESERVES;
          const have = new Set([...t.starters, ...t.reserves].map(keyOf));
          const add = dedupeNames(names).filter((n) => !have.has(keyOf(n)));
          return { ...t, [list]: [...t[list], ...add].slice(0, max) };
        }),
      removeFromRoster: (team, name) =>
        updateTeam(team, (t) => ({ ...t, starters: without(t.starters, name), reserves: without(t.reserves, name) })),
      moveInRoster: (team, name, to) =>
        updateTeam(team, (t) => {
          const max = to === "starters" ? MAX_STARTERS : MAX_RESERVES;
          if (t[to].length >= max) return t;
          const starters = without(t.starters, name);
          const reserves = without(t.reserves, name);
          const next = { starters, reserves };
          next[to] = [...next[to], cleanName(name)];
          return { ...t, ...next };
        }),
      applyRosters: (rosters) =>

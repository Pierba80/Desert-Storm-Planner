import { MAP_LABELS, PLATE_SIDE, STAGE_W, STRUCTURES, cleanName, hasAssignment } from "@/lib/planner";

export const FONT_PLATE = '"Bitter", Georgia, serif';
export const FONT_BODY = '"Barlow", "Helvetica Neue", sans-serif';
export const FONT_HEAD = '"Saira Condensed", "Barlow", sans-serif';

// Nameplate metrics in logical stage px (stage is STAGE_W wide). Shared by DOM and PNG export.
export const PLATE = {
  padX: 7, padY: 4, stripe: 3, header: 9.5, leader: 12.5, player: 10, lh: 1.25,
  minW: 84, maxW: 150, maxPlayerLines: 2, gap: 3, margin: 4, radius: 4,
};
export const PLATE_FONTS = {
  header: `800 ${PLATE.header}px ${FONT_PLATE}`,
  leader: `800 ${PLATE.leader}px ${FONT_PLATE}`,
  empty: `600 ${PLATE.leader - 2}px ${FONT_PLATE}`,
  player: `600 ${PLATE.player}px ${FONT_BODY}`,
};

let measureCtx = null;
function ctx() {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx;
}
function width(text, font) {
  const c = ctx();
  c.font = font;
  return c.measureText(text).width;
}
function fit(text, font, max) {
  if (width(text, font) <= max) return text;
  let t = text;
  while (t.length > 1 && width(`${t}…`, font) > max) t = t.slice(0, -1);
  return `${t}…`;
}

const SEP = " · ";

// Compact content: header, leader, players packed into at most N lines with a "+N" tail.
export function plateContent(name, a) {
  const inner = PLATE.maxW - PLATE.padX * 2;
  const leader = cleanName(a.leader);
  const players = a.players.map(cleanName).filter(Boolean);
  const header = fit(name.toUpperCase(), PLATE_FONTS.header, inner);
  const leaderLine = leader ? fit(`★ ${leader}`, PLATE_FONTS.leader, inner) : "No leader";
  const lines = [];
  let cur = [];
  let placed = 0;
  for (const p of players) {
    const name = fit(p, PLATE_FONTS.player, inner);
    const test = [...cur, name].join(SEP);
    if (cur.length && width(test, PLATE_FONTS.player) > inner) {
      lines.push(cur);
      cur = [];
      if (lines.length >= PLATE.maxPlayerLines) break;
    }
    cur.push(name);
    placed++;
  }
  if (cur.length && lines.length < PLATE.maxPlayerLines) lines.push(cur);
  const rest = players.length - placed;
  if (rest > 0 && lines.length) {
    const last = lines[lines.length - 1];
    const tail = () => `${last.join(SEP)}${last.length ? SEP : ""}+${players.length - placed}`;
    while (last.length > 1 && width(tail(), PLATE_FONTS.player) > inner) {
      last.pop();
      placed--;
    }
    lines[lines.length - 1] = [tail()];
  }
  const playerLines = lines.map((l) => (Array.isArray(l) ? l.join(SEP) : l));
  const w = Math.min(
    PLATE.maxW,
    Math.max(
      PLATE.minW,
      PLATE.padX * 2 +
        Math.max(
          width(header, PLATE_FONTS.header),
          width(leaderLine, leader ? PLATE_FONTS.leader : PLATE_FONTS.empty),
          ...playerLines.map((l) => width(l, PLATE_FONTS.player)),
        ),
    ),
  );
  const h =
    PLATE.stripe + PLATE.padY * 2 +
    PLATE.header * PLATE.lh + PLATE.leader * PLATE.lh + playerLines.length * PLATE.player * PLATE.lh;
  return { header, leaderLine, hasLeader: !!leader, playerLines, total: players.length, w: Math.ceil(w), h: Math.ceil(h) };
}

const overlap = (a, b) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

export function buildingRects(hotspots, stageH) {
  const out = {};
  for (const s of STRUCTURES) {
    const h = hotspots[s.id];
    if (!h) continue;
    const L = MAP_LABELS[s.id];
    const b = { x: ((h.x - h.w / 2) / 100) * STAGE_W, y: ((h.y - h.h / 2) / 100) * stageH, w: (h.w / 100) * STAGE_W, h: (h.h / 100) * stageH };
    const l = { x: ((h.x + L.dx - L.w / 2) / 100) * STAGE_W, y: ((h.y + L.dy - L.h / 2) / 100) * stageH, w: (L.w / 100) * STAGE_W, h: (L.h / 100) * stageH };
    const ux = Math.min(b.x, l.x), uy = Math.min(b.y, l.y);
    const u = { x: ux, y: uy, w: Math.max(b.x + b.w, l.x + l.w) - ux, h: Math.max(b.y + b.h, l.y + l.h) - uy };
    out[s.id] = { building: b, label: l, union: u, cx: (h.x / 100) * STAGE_W, cy: (h.y / 100) * stageH };
  }
  return out;
}

function candidates(r, w, h, side) {
  const u = r.union, b = r.building, l = r.label;
  const g = PLATE.gap + 2;
  const cx = u.x + u.w / 2, cy = u.y + u.h / 2, bcy = b.y + b.h / 2;
  const below = u.y + u.h + g, above = u.y - h - g, right = u.x + u.w + g, left = u.x - w - g;
  if (side === "left" || side === "right") {
    const x = side === "left" ? left : right;
    return [{ x, y: bcy - h / 2 }, { x, y: cy - h / 2 }, { x, y: b.y }, { x, y: u.y + u.h - h }, { x, y: b.y - h * 0.5 }, { x, y: u.y + u.h - h * 0.5 }];
  }
  if (side === "above") {
    return [{ x: cx - w / 2, y: above }, { x: cx - w * 0.2, y: above }, { x: cx - w * 0.8, y: above }, { x: cx, y: above }, { x: cx - w, y: above }, { x: cx + 25, y: above }, { x: cx - w - 25, y: above }, { x: cx + 45, y: above }, { x: cx - w - 45, y: above }];
  }
  if (side === "below") {
    // Under the label when there is room, otherwise under the building beside the printed label.
    const under = b.y + b.h + g;
    return [
      { x: cx - w / 2, y: below }, { x: cx - w * 0.2, y: below }, { x: cx - w * 0.8, y: below },
      { x: l.x + l.w + g, y: under }, { x: l.x - w - g, y: under },
      { x: l.x + l.w + g, y: l.y + l.h - h }, { x: l.x - w - g, y: l.y + l.h - h },
    ];
  }
  return [
    { x: cx - w / 2, y: below },
    { x: right, y: cy - h / 2 },
    { x: left, y: cy - h / 2 },
    { x: cx - w / 2, y: above },
    { x: right, y: u.y },
    { x: left, y: u.y },
    { x: right, y: u.y + u.h - h },
    { x: left, y: u.y + u.h - h },
    { x: cx - w * 0.1, y: below },
    { x: cx - w * 0.9, y: below },
    { x: cx - w * 0.1, y: above },
    { x: cx - w * 0.9, y: above },
    { x: right, y: above + h * 0.5 },
    { x: left, y: above + h * 0.5 },
    { x: right, y: below - h * 0.5 },
    { x: left, y: below - h * 0.5 },
  ];
}

const clampBox = (b, stageH) => ({
  ...b,
  x: Math.min(STAGE_W - PLATE.margin - b.w, Math.max(PLATE.margin, b.x)),
  y: Math.min(stageH - PLATE.margin - b.h, Math.max(PLATE.margin, b.y)),
});

/**
 * Place every assigned building's nameplate. Manual offsets (plate centre relative to building
 * centre, % of map) are honoured; the rest are auto-placed away from buildings, map labels and
 * other plates, always inside the map.
 */
export function layoutPlates({ plan, hotspots, plateOffsets, stageH }) {
  const rects = buildingRects(hotspots, stageH);
  const items = STRUCTURES.filter((s) => rects[s.id] && hasAssignment(plan.assignments[s.id])).map((s) => ({
    id: s.id, name: s.name, content: plateContent(s.name, plan.assignments[s.id]),
  }));
  const obstacles = Object.values(rects).flatMap((r) => [r.building, r.label]);
  const placed = [];
  const out = {};
  const manual = items.filter((i) => plateOffsets[i.id]);
  const auto = items.filter((i) => !plateOffsets[i.id]).sort((a, b) => Number(!PLATE_SIDE[a.id]) - Number(!PLATE_SIDE[b.id]));
  for (const it of manual) {
    const r = rects[it.id], o = plateOffsets[it.id];
    const { w, h } = it.content;
    const box = clampBox({ x: r.cx + (o.dx / 100) * STAGE_W - w / 2, y: r.cy + (o.dy / 100) * stageH - h / 2, w, h }, stageH);
    out[it.id] = { ...box, ...it, manual: true };
    placed.push(box);
  }
  for (const it of auto) {
    const r = rects[it.id];
    const { w, h } = it.content;
    let best = null;
    candidates(r, w, h, PLATE_SIDE[it.id]).forEach((c, i) => {
      const box = clampBox({ x: c.x, y: c.y, w, h }, stageH);
      let ov = 0;
      for (const o of obstacles) ov += overlap(box, o);
      for (const p of placed) ov += overlap(box, p) * 1.5;
      const bx = box.x + w / 2, by = box.y + h / 2;
      const dist = Math.hypot(bx - (r.union.x + r.union.w / 2), by - (r.union.y + r.union.h / 2));
      const score = ov * 4 + dist * 0.6 + i * 2;
      if (!best || score < best.score) best = { box, score };
    });
    out[it.id] = { ...best.box, ...it, manual: false };
    placed.push(best.box);
  }
  return out;
}

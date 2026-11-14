import { STAGE_W, STRUCTURES, TEAM_COLOR, cleanName, hasAssignment, teamTitle } from "@/lib/planner";
import { FONT_BODY, FONT_HEAD, PLATE, PLATE_FONTS, buildingRects, layoutPlates } from "@/lib/layout";

export const PLATE_COLORS = { bg: "rgba(244,229,204,0.96)", border: "rgba(92,62,32,0.55)", header: "#7A5428", leader: "#1F150B", empty: "#9A8268", player: "#3F2F20" };

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

export async function fileToDataUrl(file, maxSide = 2400) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Short connector from a plate to its building, used when the plate sits away from it.
export function connector(box, rect) {
  const b = rect.building;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const px = Math.min(box.x + box.w, Math.max(box.x, cx));
  const py = Math.min(box.y + box.h, Math.max(box.y, cy));
  const qx = Math.min(b.x + b.w, Math.max(b.x, px));
  const qy = Math.min(b.y + b.h, Math.max(b.y, py));
  if (Math.hypot(px - qx, py - qy) < 8) return null;
  return { x1: px, y1: py, x2: qx, y2: qy };
}

export async function loadPlateFonts() {
  if (!document.fonts) return;
  await Promise.all(
    [PLATE_FONTS.header, PLATE_FONTS.leader, PLATE_FONTS.empty, PLATE_FONTS.player, `800 30px ${FONT_HEAD}`, `600 10px ${FONT_BODY}`].map((f) =>
      document.fonts.load(f).catch(() => null),
    ),
  );
}

function drawPlate(ctx, p, color) {
  const { x, y, w, h } = p;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = PLATE_COLORS.bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, PLATE.radius);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, PLATE.radius);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, PLATE.stripe);
  ctx.restore();
  ctx.strokeStyle = PLATE_COLORS.border;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, PLATE.radius);
  ctx.stroke();
  const c = p.content;
  const lines = [
    { t: c.header, f: PLATE_FONTS.header, col: PLATE_COLORS.header, s: PLATE.header },
    { t: c.leaderLine, f: c.hasLeader ? PLATE_FONTS.leader : PLATE_FONTS.empty, col: c.hasLeader ? PLATE_COLORS.leader : PLATE_COLORS.empty, s: PLATE.leader },
    ...c.playerLines.map((t) => ({ t, f: PLATE_FONTS.player, col: PLATE_COLORS.player, s: PLATE.player })),
  ];
  let cy = y + PLATE.stripe + PLATE.padY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const l of lines) {
    const lh = l.s * PLATE.lh;
    ctx.font = l.f;
    ctx.fillStyle = l.col;
    ctx.fillText(l.t, x + w / 2, cy + lh / 2);
    cy += lh;
  }
}

function wrapNames(ctx, names, maxW) {
  const lines = [];
  let line = "";
  for (const n of names) {
    const next = line ? `${line}   ·   ${n}` : n;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = n;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const HEADER_H = 64;
const FOOTER_H = 18;

export async function exportTeamPlan({ team, imageSrc, hotspots, plateOffsets, plan, battle }) {
  await loadPlateFonts();
  const img = await loadImage(imageSrc);
  const stageH = (STAGE_W * img.naturalHeight) / img.naturalWidth;
  const outW = Math.max(3000, img.naturalWidth * 2);
  const k = outW / STAGE_W;
  const color = TEAM_COLOR[team];
  const plates = layoutPlates({ plan, hotspots, plateOffsets, stageH });
  const rects = buildingRects(hotspots, stageH);
  const assigned = STRUCTURES.filter((s) => hasAssignment(plan.assignments[s.id]));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const reserves = plan.reserves.map(cleanName).filter(Boolean);
  ctx.font = `600 10px ${FONT_BODY}`;
  const resLines = reserves.length ? wrapNames(ctx, reserves, STAGE_W - 40) : [];
  const reservesH = reserves.length ? 28 + resLines.length * 14 : 0;
  const totalH = HEADER_H + stageH + reservesH + FOOTER_H;

  canvas.width = Math.round(outW);
  canvas.height = Math.round(totalH * k);
  ctx.scale(k, k);

  ctx.fillStyle = "#1A1612";
  ctx.fillRect(0, 0, STAGE_W, totalH);
  ctx.fillStyle = color;
  ctx.fillRect(0, HEADER_H - 2.5, STAGE_W, 2.5);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 30px ${FONT_HEAD}`;
  ctx.fillStyle = "#F2C14E";
  ctx.fillText(teamTitle(team), 20, 36);
  ctx.font = `600 10px ${FONT_BODY}`;
  ctx.fillStyle = "#D9C4A3";
  const players = assigned.reduce((n, s) => {
    const a = plan.assignments[s.id];
    return n + a.players.filter(cleanName).length + (cleanName(a.leader) ? 1 : 0);
  }, 0);
  ctx.fillText(
    `${battle ? `BATTLE: ${battle.toUpperCase()}   ·   ` : ""}${assigned.length}/11 BUILDINGS   ·   ${players} PLAYERS   ·   ${plan.starters.length} STARTERS   ·   ${reserves.length} RESERVES`,
    20, 52,
  );

  ctx.save();
  ctx.translate(0, HEADER_H);
  ctx.drawImage(img, 0, 0, STAGE_W, stageH);
  for (const s of assigned) {
    const b = rects[s.id]?.building;
    if (!b) continue;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 6);
    ctx.stroke();
  }
  for (const p of Object.values(plates)) {
    const c = connector(p, rects[p.id]);
    if (!c) continue;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 2.5]);
    ctx.beginPath();
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    ctx.stroke();
    ctx.restore();
  }
  for (const p of Object.values(plates)) drawPlate(ctx, p, color);
  ctx.restore();

  if (reserves.length) {
    const top = HEADER_H + stageH;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `800 11px ${FONT_HEAD}`;
    ctx.fillStyle = "#F2C14E";
    ctx.fillText(`RESERVES (${reserves.length})`, 20, top + 18);
    ctx.font = `600 10px ${FONT_BODY}`;
    ctx.fillStyle = "#EADBC2";
    resLines.forEach((l, i) => ctx.fillText(l, 20, top + 33 + i * 14));
  }

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = `600 7px ${FONT_BODY}`;
  ctx.fillStyle = "#8C7A62";
  ctx.fillText(`${teamTitle(team)} · DESERT STORM PLANNER · ${new Date().toLocaleDateString()}`, STAGE_W - 12, totalH - FOOTER_H / 2);

  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Export failed");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `desert-storm-team-${team.toLowerCase()}-plan.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { width: canvas.width, height: canvas.height };
}

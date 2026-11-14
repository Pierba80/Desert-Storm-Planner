import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { DEFAULT_MAP_RATIO, STAGE_W, STRUCTURES, TEAM_COLOR, hasAssignment } from "@/lib/planner";
import { buildingRects, layoutPlates } from "@/lib/layout";
import { connector, loadPlateFonts } from "@/lib/exportPlan";
import Nameplate from "@/components/Nameplate";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function useMapView(wrapRef, stageH) {
  const [view, setView] = useState({ s: 1, tx: 0, ty: 0 });
  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const s = Math.min(width / STAGE_W, height / stageH);
    setView({ s, tx: (width - STAGE_W * s) / 2, ty: (height - stageH * s) / 2 });
  }, [wrapRef, stageH]);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, wrapRef]);
  const zoomAt = useCallback((cx, cy, f) => {
    setView((v) => {
      const s = clamp(v.s * f, 0.2, 8);
      const r = s / v.s;
      return { s, tx: cx - (cx - v.tx) * r, ty: cy - (cy - v.ty) * r };
    });
  }, []);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, wrapRef]);
  return { view, setView, fit, zoomAt };
}

export default function BattleMap(p) {
  const wrapRef = useRef(null);
  const [stageH, setStageH] = useState(STAGE_W * DEFAULT_MAP_RATIO);
  const [fontsReady, setFontsReady] = useState(0);
  const { view, setView, fit, zoomAt } = useMapView(wrapRef, stageH);
  const pointers = useRef(new Map());
  const pan = useRef(null);
  const pinch = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);
  const color = TEAM_COLOR[p.team];

  useEffect(() => {
    loadPlateFonts().then(() => setFontsReady((n) => n + 1));
  }, []);

  const rects = useMemo(() => buildingRects(p.hotspots, stageH), [p.hotspots, stageH]);
  const plates = useMemo(
    () => layoutPlates({ plan: p.plan, hotspots: p.hotspots, plateOffsets: p.plateOffsets, stageH }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.plan, p.hotspots, p.plateOffsets, stageH, fontsReady],
  );

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: view.s, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, tx: view.tx, ty: view.ty };
      pan.current = null;
      moved.current = true;
    } else if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
      moved.current = false;
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (d) {
      const dx = (e.clientX - d.cx) / view.s, dy = (e.clientY - d.cy) / view.s;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      if (!moved.current) return;
      if (d.kind === "zone") {
        p.onHotspotMove(d.id, clamp(d.x + (dx / STAGE_W) * 100, 0, 100), clamp(d.y + (dy / stageH) * 100, 0, 100));
      } else {
        const r = rects[d.id];
        p.onPlateMove(d.id, ((d.x + dx - r.cx) / STAGE_W) * 100, ((d.y + dy - r.cy) / stageH) * 100);
      }
      return;
    }
    const pc = pinch.current;
    if (pc && pointers.current.size === 2) {
      const r = wrapRef.current.getBoundingClientRect();
      const [a, b] = [...pointers.current.values()];
      const s = clamp((pc.s * Math.hypot(a.x - b.x, a.y - b.y)) / pc.d, 0.2, 8);
      const k = s / pc.s;
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      setView({ s, tx: mx - (pc.mx - pc.tx) * k, ty: my - (pc.my - pc.ty) * k });
      return;
    }
    const pn = pan.current;
    if (pn) {
      const dx = e.clientX - pn.x, dy = e.clientY - pn.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
      if (moved.current) setView((v) => ({ ...v, tx: pn.tx + dx, ty: pn.ty + dy }));
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      pan.current = null;
      drag.current = null;
    }
  };

  const startZoneDrag = (id) => (e) => {
    e.stopPropagation();
    const h = p.hotspots[id];
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { kind: "zone", id, cx: e.clientX, cy: e.clientY, x: h.x, y: h.y };
    moved.current = false;
  };

  const startPlateDrag = (id) => (e) => {
    e.stopPropagation();
    const b = plates[id];
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { kind: "plate", id, cx: e.clientX, cy: e.clientY, x: b.x + b.w / 2, y: b.y + b.h / 2 };
    moved.current = false;
  };

  const zoomCenter = (f) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) zoomAt(r.width / 2, r.height / 2, f);
  };

  const click = (id) => (e) => {
    e.stopPropagation();
    if (!moved.current) p.onBuildingClick(id);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="map-area flex min-h-0 w-full flex-1 items-start justify-center p-1 lg:items-center">
      <div
        ref={wrapRef}
        data-testid="map-workspace"
        className="map-frame map-grid relative cursor-grab touch-none select-none overflow-hidden rounded-lg border border-[var(--line-strong)] active:cursor-grabbing"
        style={{ "--ratio": STAGE_W / stageH }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: STAGE_W, height: stageH, transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})` }}
        >
          <img
            src={p.imageSrc}
            alt="Desert Storm battlefield"
            data-testid="map-image"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth) setStageH((STAGE_W * img.naturalHeight) / img.naturalWidth);
            }}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          <svg className="pointer-events-none absolute inset-0 z-[12] overflow-visible" width={STAGE_W} height={stageH}>
            {Object.values(plates).map((b) => {
              const c = connector(b, rects[b.id]);
              return c ? <line key={b.id} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={color} strokeWidth={1.2} strokeDasharray="3 2.5" /> : null;
            })}
          </svg>

          {STRUCTURES.map((s) => {
            const r = rects[s.id];
            if (!r) return null;
            const assigned = hasAssignment(p.plan.assignments[s.id]);
            const { building: b, label: l } = r;
            return (
              <div key={s.id}>
                <button
                  type="button"
                  data-testid={`structure-${s.id}`}
                  aria-label={s.name}
                  onPointerDown={p.editMode ? startZoneDrag(s.id) : undefined}
                  onClick={click(s.id)}
                  className={`zone group absolute z-[10] rounded-md outline-none ${p.editMode ? "zone-edit cursor-move" : "cursor-pointer"} ${assigned && !p.editMode ? "zone-assigned" : ""}`}
                  style={{ left: b.x, top: b.y, width: b.w, height: b.h, "--team": color }}
                >
                  <span className={`zone-tag ${p.editMode ? "opacity-100" : ""}`}>{s.name}</span>
                </button>
                {!p.editMode && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    data-testid={`structure-label-${s.id}`}
                    onClick={click(s.id)}
                    className="label-hit absolute z-[10] rounded-md"
                    style={{ left: l.x, top: l.y, width: l.w, height: l.h }}
                  />
                )}
              </div>
            );
          })}

          {Object.values(plates).map((b) => (
            <Nameplate
              key={b.id}
              box={b}
              color={color}
              editMode={p.editMode}
              onPointerDown={startPlateDrag(b.id)}
              onClick={() => {
                if (!moved.current) p.onBuildingClick(b.id);
              }}
            />
          ))}
        </div>
      </div>
      </div>

      <div data-testid="map-toolbar" className="flex h-12 shrink-0 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2">
        <div className="flex items-center overflow-hidden rounded-md border border-[var(--line)]">
          <button type="button" data-testid="zoom-out-btn" aria-label="Zoom out" onClick={() => zoomCenter(0.8)} className="tool-btn h-9 w-10">
            <Minus className="size-4" />
          </button>
          <span data-testid="zoom-level" className="min-w-14 border-x border-[var(--line)] px-2 text-center font-mono text-[11px] text-[var(--sand)]">
            {Math.round(view.s * 100)}%
          </span>
          <button type="button" data-testid="zoom-in-btn" aria-label="Zoom in" onClick={() => zoomCenter(1.25)} className="tool-btn h-9 w-10">
            <Plus className="size-4" />
          </button>
        </div>
        <button type="button" data-testid="zoom-fit-btn" onClick={fit} className="tool-btn flex h-9 items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 text-xs uppercase tracking-wider">
          <Maximize className="size-4" /> <span className="hidden sm:inline">Fit</span>
        </button>
        <span className="ml-1 hidden text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] md:inline">
          {p.editMode ? "Drag building zones and nameplates" : "Tap a building · drag nameplates · scroll / pinch to zoom"}
        </span>
        <div className="ml-auto flex items-center">{p.toolbarExtra}</div>
      </div>
    </div>
  );
}

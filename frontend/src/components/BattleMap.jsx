import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { DEFAULT_MAP_RATIO, STAGE_W, STRUCTURES, TEAM_COLOR, hasAssignment } from "@/lib/planner";
import { buildingRects, layoutPlates } from "@/lib/layout";
import { connector, loadPlateFonts } from "@/lib/exportPlan";
import { clamp, useMapGestures, useMapView } from "@/hooks/useMapGestures";
import Nameplate from "@/components/Nameplate";

// Re-measures nameplates once the web fonts are loaded (text widths change).
function useFontsVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadPlateFonts().then(() => setVersion((n) => n + 1));
  }, []);
  return version;
}

export default function BattleMap(p) {
  const wrapRef = useRef(null);
  const [stageH, setStageH] = useState(STAGE_W * DEFAULT_MAP_RATIO);
  const fontsVersion = useFontsVersion();
  const { view, setView, fit, zoomCenter } = useMapView(wrapRef, stageH);
  const color = TEAM_COLOR[p.team];

  const rects = useMemo(() => buildingRects(p.hotspots, stageH), [p.hotspots, stageH]);
  const plates = useMemo(
    () => layoutPlates({ plan: p.plan, hotspots: p.hotspots, plateOffsets: p.plateOffsets, stageH }),
    // fontsVersion is intentionally listed: layout measures text with canvas, so it must rerun after fonts load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.plan, p.hotspots, p.plateOffsets, stageH, fontsVersion],
  );

  const onDrag = (d, dx, dy) => {
    if (d.kind === "zone") {
      p.onHotspotMove(d.id, clamp(d.x + (dx / STAGE_W) * 100, 0, 100), clamp(d.y + (dy / stageH) * 100, 0, 100));
      return;
    }
    const r = rects[d.id];
    p.onPlateMove(d.id, ((d.x + dx - r.cx) / STAGE_W) * 100, ((d.y + dy - r.cy) / stageH) * 100);
  };
  const { handlers, startDrag, wasDragged } = useMapGestures({ wrapRef, view, setView, onDrag });

  const open = (id) => {
    if (!wasDragged()) p.onBuildingClick(id);
  };
  const startZoneDrag = (id) => startDrag({ kind: "zone", id, x: p.hotspots[id].x, y: p.hotspots[id].y });
  const startPlateDrag = (b) => startDrag({ kind: "plate", id: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2 });

  return (
    <div className="flex h-full w-full flex-col">
      <div className="map-area flex min-h-0 w-full flex-1 items-start justify-center p-1 lg:items-center">
        <div
          ref={wrapRef}
          data-testid="map-workspace"
          className="map-frame map-grid relative cursor-grab touch-none select-none overflow-hidden rounded-lg border border-[var(--line-strong)] active:cursor-grabbing"
          style={{ "--ratio": STAGE_W / stageH }}
          {...handlers}
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
            <Connectors plates={plates} rects={rects} color={color} stageH={stageH} />
            {STRUCTURES.filter((s) => rects[s.id]).map((s) => (
              <BuildingZone
                key={s.id}
                s={s}
                rect={rects[s.id]}
                color={color}
                editMode={p.editMode}
                assigned={hasAssignment(p.plan.assignments[s.id])}
                onDragStart={startZoneDrag(s.id)}
                onOpen={() => open(s.id)}
              />
            ))}
            {Object.values(plates).map((b) => (
              <Nameplate key={b.id} box={b} color={color} editMode={p.editMode} onPointerDown={startPlateDrag(b)} onClick={() => open(b.id)} />
            ))}
          </div>
        </div>
      </div>
      <MapToolbar scale={view.s} editMode={p.editMode} onZoom={zoomCenter} onFit={fit} extra={p.toolbarExtra} />
    </div>
  );
}

function Connectors({ plates, rects, color, stageH }) {
  return (
    <svg className="pointer-events-none absolute inset-0 z-[12] overflow-visible" width={STAGE_W} height={stageH}>
      {Object.values(plates).map((b) => {
        const c = connector(b, rects[b.id]);
        return c ? <line key={b.id} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={color} strokeWidth={1.2} strokeDasharray="3 2.5" /> : null;
      })}
    </svg>
  );
}

function BuildingZone({ s, rect, color, editMode, assigned, onDragStart, onOpen }) {
  const { building: b, label: l } = rect;
  const click = (e) => {
    e.stopPropagation();
    onOpen();
  };
  const mode = editMode ? "zone-edit cursor-move" : "cursor-pointer";
  return (
    <>
      <button
        type="button"
        data-testid={`structure-${s.id}`}
        aria-label={s.name}
        onPointerDown={editMode ? onDragStart : undefined}
        onClick={click}
        className={`zone group absolute z-[10] rounded-md outline-none ${mode} ${assigned && !editMode ? "zone-assigned" : ""}`}
        style={{ left: b.x, top: b.y, width: b.w, height: b.h, "--team": color }}
      >
        <span className={`zone-tag ${editMode ? "opacity-100" : ""}`}>{s.name}</span>
      </button>
      {!editMode && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          data-testid={`structure-label-${s.id}`}
          onClick={click}
          className="label-hit absolute z-[10] rounded-md"
          style={{ left: l.x, top: l.y, width: l.w, height: l.h }}
        />
      )}
    </>
  );
}

function MapToolbar({ scale, editMode, onZoom, onFit, extra }) {
  return (
    <div data-testid="map-toolbar" className="flex h-12 shrink-0 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2">
      <div className="flex items-center overflow-hidden rounded-md border border-[var(--line)]">
        <button type="button" data-testid="zoom-out-btn" aria-label="Zoom out" onClick={() => onZoom(0.8)} className="tool-btn h-9 w-10">
          <Minus className="size-4" />
        </button>
        <span data-testid="zoom-level" className="min-w-14 border-x border-[var(--line)] px-2 text-center font-mono text-[11px] text-[var(--sand)]">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" data-testid="zoom-in-btn" aria-label="Zoom in" onClick={() => onZoom(1.25)} className="tool-btn h-9 w-10">
          <Plus className="size-4" />
        </button>
      </div>
      <button type="button" data-testid="zoom-fit-btn" onClick={onFit} className="tool-btn flex h-9 items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 text-xs uppercase tracking-wider">
        <Maximize className="size-4" /> <span className="hidden sm:inline">Fit</span>
      </button>
      <span className="ml-1 hidden text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] md:inline">
        {editMode ? "Drag building zones and nameplates" : "Tap a building · drag nameplates · scroll / pinch to zoom"}
      </span>
      <div className="ml-auto flex items-center">{extra}</div>
    </div>
  );
}

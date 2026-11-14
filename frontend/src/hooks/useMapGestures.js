import { useCallback, useEffect, useRef, useState } from "react";
import { STAGE_W } from "@/lib/planner";

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Pan/zoom transform of the map stage, fitted to the frame.
export function useMapView(wrapRef, stageH) {
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
  const zoomCenter = (f) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) zoomAt(r.width / 2, r.height / 2, f);
  };
  return { view, setView, fit, zoomCenter };
}

const midpoint = (a, b, r) => ({ x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top });

/**
 * Pointer gestures on the map: one finger pans, two pinch-zoom, and items
 * (zones / nameplates) can be dragged. `onDrag(drag, dx, dy)` gets stage-unit deltas.
 */
export function useMapGestures({ wrapRef, view, setView, onDrag }) {
  const pointers = useRef(new Map());
  const pan = useRef(null);
  const pinch = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);
  const track = (e) => pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

  const startPinch = () => {
    const r = wrapRef.current.getBoundingClientRect();
    const [a, b] = [...pointers.current.values()];
    const m = midpoint(a, b, r);
    pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: view.s, mx: m.x, my: m.y, tx: view.tx, ty: view.ty };
    pan.current = null;
    moved.current = true;
  };

  const onPointerDown = (e) => {
    track(e);
    if (drag.current) return;
    if (pointers.current.size === 2) startPinch();
    else if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
      moved.current = false;
    }
  };

  const moveDrag = (e) => {
    const d = drag.current;
    const dx = (e.clientX - d.cx) / view.s, dy = (e.clientY - d.cy) / view.s;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    if (moved.current) onDrag(d, dx, dy);
  };

  const movePinch = () => {
    const pc = pinch.current;
    const r = wrapRef.current.getBoundingClientRect();
    const [a, b] = [...pointers.current.values()];
    const s = clamp((pc.s * Math.hypot(a.x - b.x, a.y - b.y)) / pc.d, 0.2, 8);
    const k = s / pc.s;
    const m = midpoint(a, b, r);
    setView({ s, tx: m.x - (pc.mx - pc.tx) * k, ty: m.y - (pc.my - pc.ty) * k });
  };

  const movePan = (e) => {
    const pn = pan.current;
    const dx = e.clientX - pn.x, dy = e.clientY - pn.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    if (moved.current) setView((v) => ({ ...v, tx: pn.tx + dx, ty: pn.ty + dy }));
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    track(e);
    if (drag.current) moveDrag(e);
    else if (pinch.current && pointers.current.size === 2) movePinch();
    else if (pan.current) movePan(e);
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      pan.current = null;
      drag.current = null;
    }
  };

  // Starts dragging an item; `item` carries kind, id and its starting x/y.
  const startDrag = (item) => (e) => {
    e.stopPropagation();
    track(e);
    drag.current = { ...item, cx: e.clientX, cy: e.clientY };
    moved.current = false;
  };

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onPointerLeave: onPointerUp },
    startDrag,
    wasDragged: () => moved.current,
  };
}

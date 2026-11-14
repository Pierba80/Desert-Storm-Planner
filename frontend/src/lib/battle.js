import { useEffect, useState } from "react";

export const LIVE_MS = 60 * 60 * 1000;
export const REMINDER_MS = 15 * 60 * 1000;

export function battleStatus(b, now) {
  if (!b.at) return null;
  const start = new Date(b.at);
  if (Number.isNaN(start.getTime())) return null;
  if (b.weekly) {
    while (now >= start.getTime() + LIVE_MS) start.setDate(start.getDate() + 7);
  }
  const t = start.getTime();
  return {
    start,
    live: now >= t && now < t + LIVE_MS,
    ended: !b.weekly && now >= t + LIVE_MS,
    soon: now < t && t - now <= REMINDER_MS,
  };
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return d > 0 ? `${d}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

export function formatBattleTime(start) {
  return start.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function battleLabel(b, now = Date.now()) {
  const st = battleStatus(b, now);
  if (!st) return null;
  const when = formatBattleTime(st.start);
  if (b.weekly) return `${when} · every ${st.start.toLocaleDateString([], { weekday: "long" })}`;
  return when;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

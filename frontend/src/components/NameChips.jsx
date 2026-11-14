import { TriangleAlert } from "lucide-react";
import { formatPower, keyOf, placementLabel, slug } from "@/lib/planner";

// Tappable name chips; mousedown is cancelled so the input keeps focus.
export function NameChips({ names, onPick, testId, label, powerIdx }) {
  if (!names.length) return null;
  return (
    <div data-testid={testId} className="flex flex-wrap items-center gap-1.5 pt-1" onMouseDown={(e) => e.preventDefault()}>
      {label && <span className="eyebrow mr-1">{label}</span>}
      {names.map((n) => (
        <button key={n} type="button" data-testid={`${testId}-item-${slug(n)}`} onClick={() => onPick(n)} className="chip">
          {n}
          {powerIdx?.get(keyOf(n))?.power != null && <span className="ml-1 text-[10px] text-[var(--muted)]">{formatPower(powerIdx.get(keyOf(n)).power)}</span>}
        </button>
      ))}
    </div>
  );
}

// Inline warning for a name that is also placed elsewhere (other team or another building).
export function DupNote({ name, placements, team, id, testId, crossOnly }) {
  const entry = placements.get(keyOf(name));
  if (!entry) return null;
  let skipped = false;
  const others = entry.placements.filter((p) => {
    if (!skipped && p.team === team && p.id === id) {
      skipped = true;
      return false;
    }
    return true;
  });
  const bad = others.filter((p) => p.team !== team || (!crossOnly && (p.role === "leader" || p.role === "player")));
  if (!bad.length) return null;
  return (
    <p data-testid={testId} className="flex basis-full items-start gap-1 pl-1 text-[11px] text-[#F08A7E]">
      <TriangleAlert className="mt-px size-3 shrink-0" /> Also on {bad.map(placementLabel).join(", ")}
    </p>
  );
}

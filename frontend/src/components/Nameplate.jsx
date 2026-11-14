import { PLATE, PLATE_FONTS } from "@/lib/layout";
import { PLATE_COLORS } from "@/lib/exportPlan";

const line = (font, size, color) => ({ font, height: size * PLATE.lh, lineHeight: `${size * PLATE.lh}px`, color });

// Nameplate on the map; geometry and text come from layoutPlates so it matches the PNG export.
export default function Nameplate({ box, color, editMode, onPointerDown, onClick }) {
  const c = box.content;
  return (
    <button
      type="button"
      data-testid={`nameplate-${box.id}`}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`${box.name} nameplate`}
      title={editMode ? "Drag to move" : `${box.name} — click to edit, drag to move`}
      className={`plate absolute z-20 cursor-grab overflow-hidden text-center active:cursor-grabbing ${editMode ? "plate-edit" : ""}`}
      style={{
        left: box.x, top: box.y, width: box.w, height: box.h,
        borderRadius: PLATE.radius, background: PLATE_COLORS.bg, borderTop: `${PLATE.stripe}px solid ${color}`,
        padding: `${PLATE.padY}px ${PLATE.padX}px`, whiteSpace: "nowrap",
      }}
    >
      <span className="block" style={line(PLATE_FONTS.header, PLATE.header, PLATE_COLORS.header)}>{c.header}</span>
      <span
        data-testid={`nameplate-leader-${box.id}`}
        className="block"
        style={line(c.hasLeader ? PLATE_FONTS.leader : PLATE_FONTS.empty, PLATE.leader, c.hasLeader ? PLATE_COLORS.leader : PLATE_COLORS.empty)}
      >
        {c.leaderLine}
      </span>
      {c.playerLines.map((t, i) => (
        <span key={`${box.id}-line-${t}`} data-testid={`nameplate-players-${box.id}-${i}`} className="block" style={line(PLATE_FONTS.player, PLATE.player, PLATE_COLORS.player)}>
          {t}
        </span>
      ))}
    </button>
  );
}

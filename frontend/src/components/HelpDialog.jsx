import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STEPS = [
  ["Members", "Open Members and paste your alliance list (name, power, squad type). Duplicates are removed."],
  ["Build the teams", "In Team roster pick 20 starters and 10 reserves for Team A and Team B. Balance teams proposes a split by power — only applied if you confirm."],
  ["Assign buildings", "Tap a building on the map to set its leader and players. Suggestions show team players not yet on a building."],
  ["Nameplates", "Nameplates place themselves away from buildings and map labels. Drag any nameplate to move it; Auto-arrange puts them back."],
  ["Layout", "Edit layout lets you drag building zones (useful with a custom map). Reset restores the default positions."],
  ["Warnings", "Players in both teams or on two buildings are flagged in red in the console and in the building window."],
  ["Export & print", "Export saves a high-resolution PNG per team, exactly as on screen. Print creates a roster sheet (save as PDF)."],
  ["Battle time", "Click the countdown to set the battle time (optionally weekly). A reminder appears 15 minutes before."],
];

export default function HelpDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="help-dialog" className="panel-dialog max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="font-head text-2xl font-extrabold uppercase text-[var(--gold)]">How it works</DialogTitle>
          <DialogDescription className="text-[var(--muted)]">Everything saves automatically in this browser.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="mt-0.5 font-mono text-xs text-[var(--gold)]">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{t}</p>
                <p className="text-sm text-[var(--muted)]">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

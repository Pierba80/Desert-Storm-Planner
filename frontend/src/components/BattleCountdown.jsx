import { useState } from "react";
import { CalendarClock, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LIVE_MS, battleStatus, formatBattleTime, formatCountdown, useNow } from "@/lib/battle";

export default function BattleCountdown({ battle, onChange }) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const st = battleStatus(battle, now);
  let label = "Next battle", value = "Set time", tone = "border-[var(--line-strong)] text-[var(--sand)]";
  if (st?.live) {
    label = "Battle live";
    value = formatCountdown(st.start.getTime() + LIVE_MS - now);
    tone = "border-red-500/70 text-red-300 live-glow";
  } else if (st?.soon) {
    label = "Starting soon";
    value = formatCountdown(st.start.getTime() - now);
    tone = "border-[var(--gold)] text-[var(--gold)] soon-glow";
  } else if (st?.ended) {
    label = "Battle ended";
    value = formatBattleTime(st.start);
    tone = "border-[var(--line)] text-[var(--muted)]";
  } else if (st) value = formatCountdown(st.start.getTime() - now);

  return (
    <>
      <button type="button" data-testid="battle-countdown" onClick={() => setOpen(true)} className={`flex items-center gap-2.5 rounded-md border bg-black/25 px-3 py-1.5 text-left transition-colors duration-200 hover:bg-black/40 ${tone}`}>
        {st?.live ? <Swords className="size-5 shrink-0" /> : <CalendarClock className="size-5 shrink-0" />}
        <span className="leading-tight">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] opacity-80">{label}</span>
          <span data-testid="battle-countdown-value" className="block font-mono text-base font-semibold tabular-nums">{value}</span>
          {st && !st.ended && <span data-testid="battle-countdown-when" className="block text-[10px] text-[var(--muted)]">{formatBattleTime(st.start)}{battle.weekly ? " · weekly" : ""}</span>}
        </span>
      </button>
      <BattleDialog key={open ? "o" : "c"} open={open} onOpenChange={setOpen} battle={battle} onSave={(b) => { onChange(b); setOpen(false); }} />
    </>
  );
}

function BattleDialog({ open, onOpenChange, battle, onSave }) {
  const [at, setAt] = useState(battle.at ?? "");
  const [weekly, setWeekly] = useState(battle.weekly);
  const parsed = at ? new Date(at) : null;
  const valid = parsed !== null && !Number.isNaN(parsed.getTime());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="battle-dialog" className="panel-dialog max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="font-head text-2xl font-extrabold uppercase text-[var(--gold)]">Battle start time</DialogTitle>
          <DialogDescription className="text-[var(--muted)]">Shared by Team A and Team B. Uses this device's local time.</DialogDescription>
        </DialogHeader>
        <Input type="datetime-local" data-testid="battle-datetime-input" value={at} onChange={(e) => setAt(e.target.value)} className="field h-11 [color-scheme:dark]" />
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-[var(--line)] px-3">
          <Checkbox data-testid="battle-weekly-checkbox" checked={weekly} onCheckedChange={(c) => setWeekly(c === true)} />
          <span className="text-sm">
            Repeat weekly
            {valid && weekly && <span className="block text-xs text-[var(--muted)]">Every {parsed.toLocaleDateString([], { weekday: "long" })} at {parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </span>
        </label>
        <DialogFooter className="gap-2">
          {battle.at && <Button variant="ghost" data-testid="battle-clear-btn" className="mr-auto text-red-400 hover:bg-red-500/10" onClick={() => { onSave({ at: null, weekly: false }); toast("Battle time cleared"); }}>Clear</Button>}
          <DialogClose asChild><Button variant="outline" data-testid="battle-cancel-btn">Cancel</Button></DialogClose>
          <Button data-testid="battle-save-btn" className="btn-gold" disabled={!valid} onClick={() => { onSave({ at, weekly }); toast.success("Battle time saved"); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

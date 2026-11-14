import { useEffect, useRef, useState } from "react";
import { AlarmClock, X } from "lucide-react";
import { toast } from "sonner";
import { battleStatus, formatBattleTime, formatCountdown, useNow } from "@/lib/battle";

const DISMISS_KEY = "desert_storm_planner_reminder_dismissed_v1";

export default function BattleReminder({ battle }) {
  const now = useNow();
  const st = battleStatus(battle, now);
  const startTs = st?.start.getTime() ?? null;
  const [dismissed, setDismissed] = useState(() => {
    const v = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  });
  const notified = useRef(null);
  const soon = !!st?.soon;

  useEffect(() => {
    if (soon && startTs !== null && notified.current !== startTs) {
      notified.current = startTs;
      toast.warning("Desert Storm starts in less than 15 minutes — get squads into position!", { duration: 8000 });
    }
  }, [soon, startTs]);

  if (!st || !soon || startTs === null || dismissed === startTs) return null;
  return (
    <div role="alert" data-testid="battle-reminder" className="soon-glow mx-2 mb-2 flex items-center gap-3 rounded-md border border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-2.5 sm:mx-4">
      <AlarmClock className="size-6 shrink-0 text-[var(--gold)]" />
      <div className="min-w-0 flex-1">
        <p className="font-head text-base font-bold uppercase tracking-wide text-[var(--text)]">
          Battle starts in <span data-testid="battle-reminder-countdown" className="font-mono tabular-nums text-[var(--gold)]">{formatCountdown(startTs - now)}</span>
        </p>
        <p className="truncate text-xs text-[var(--muted)]">{formatBattleTime(st.start)} · Both teams: confirm leaders and get squads into position.</p>
      </div>
      <button
        type="button"
        data-testid="battle-reminder-dismiss"
        aria-label="Dismiss reminder"
        onClick={() => { setDismissed(startTs); try { localStorage.setItem(DISMISS_KEY, String(startTs)); } catch { /* ignore */ } }}
        className="flex size-10 shrink-0 items-center justify-center rounded text-[var(--sand)] hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

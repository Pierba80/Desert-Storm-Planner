import { useMemo } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TEAMS, TEAM_COLOR, formatPower, keyOf, memberIndex } from "@/lib/planner";
import { proposeBalance, totalPower } from "@/lib/members";

export default function BalanceDialog({ open, onOpenChange, teams, members, onApply }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="balance-dialog" className="panel-dialog max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        {open && <Preview teams={teams} members={members} onApply={(r) => { onApply(r); onOpenChange(false); }} />}
      </DialogContent>
    </Dialog>
  );
}

function Preview({ teams, members, onApply }) {
  const proposal = useMemo(() => proposeBalance(teams, members), [teams, members]);
  const idx = useMemo(() => memberIndex(members), [members]);
  const { rosters, excluded, poolSize } = proposal;
  const st = (t) => totalPower(rosters[t].starters, members);
  const diff = Math.abs(st("A") - st("B"));
  const noPower = members.every((m) => m.power == null);

  return (
    <>
      <DialogHeader className="text-left">
        <DialogTitle className="flex items-center gap-2 font-head text-2xl font-extrabold uppercase text-[var(--gold)]"><Scale className="size-5" /> Balance teams — preview</DialogTitle>
        <DialogDescription className="text-[var(--muted)]">
          Proposed split of {poolSize} players by power. Nothing changes until you apply it. Building assignments are not touched.
        </DialogDescription>
      </DialogHeader>
      {poolSize < 2 ? (
        <p data-testid="balance-empty" className="rounded-md border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">Add at least two members (with power) or roster players first.</p>
      ) : (
        <>
          {noPower && <p className="text-xs text-[var(--gold)]">No power values found in the member list — the split will be by count only.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {TEAMS.map((t) => (
              <div key={t} data-testid={`balance-team-${t.toLowerCase()}`} className="rounded-md border border-[var(--line)] bg-[var(--panel-2)] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-head text-lg font-bold uppercase" style={{ color: TEAM_COLOR[t] }}>Team {t}</span>
                  <span data-testid={`balance-power-${t.toLowerCase()}`} className="font-mono text-sm text-[var(--sand)]">{formatPower(st(t))}</span>
                </div>
                <p className="eyebrow mt-2">Starters ({rosters[t].starters.length})</p>
                <ul className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-[var(--text)]">
                  {rosters[t].starters.map((n) => <li key={n} className="flex justify-between gap-1 truncate"><span className="truncate">{n}</span><span className="font-mono text-[var(--muted)]">{formatPower(idx.get(keyOf(n))?.power)}</span></li>)}
                </ul>
                <p className="eyebrow mt-2">Reserves ({rosters[t].reserves.length})</p>
                <ul className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-[var(--muted)]">
                  {rosters[t].reserves.map((n) => <li key={n} className="truncate">{n}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p data-testid="balance-diff" className="text-sm text-[var(--muted)]">
            Starter power difference: <span className="font-mono text-[var(--sand)]">{formatPower(diff)}</span>
            {excluded.length > 0 && <> · {excluded.length} not included (teams full)</>}
          </p>
        </>
      )}
      <DialogFooter className="gap-2">
        <DialogClose asChild><Button variant="outline" data-testid="balance-cancel-btn">Cancel</Button></DialogClose>
        <Button data-testid="balance-apply-btn" className="btn-gold" disabled={poolSize < 2} onClick={() => onApply(rosters)}>Apply this split</Button>
      </DialogFooter>
    </>
  );
}

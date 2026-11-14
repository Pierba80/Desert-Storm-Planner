import { useState } from "react";
import { ChevronRight, Crown, Trash2, TriangleAlert, UserRoundX, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MAX_RESERVES, MAX_STARTERS, STRUCTURES, TEAM_COLOR, cleanName, formatPower, hasAssignment, placementLabel, slug, teamTitle } from "@/lib/planner";
import { totalPower } from "@/lib/members";

export default function SidePanel({ team, teams, members, conflicts, unassigned, actions, onOpenBuilding, onGoto }) {
  const plan = teams[team];
  const [confirm, setConfirm] = useState(false);
  const assigned = STRUCTURES.filter((s) => hasAssignment(plan.assignments[s.id]));
  const onBuildings = assigned.reduce((n, s) => {
    const a = plan.assignments[s.id];
    return n + a.players.filter(cleanName).length + (cleanName(a.leader) ? 1 : 0);
  }, 0);
  const color = TEAM_COLOR[team];

  return (
    <div className="flex h-full flex-col" data-testid="side-panel">
      <div className="border-b border-[var(--line)] px-5 pb-4 pt-5">
        <p className="eyebrow" style={{ color }}>Battle console</p>
        <h2 className="font-head text-2xl font-extrabold uppercase tracking-tight text-[var(--text)]">{teamTitle(team)}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Buildings" value={`${assigned.length}/11`} testId="stat-buildings" />
          <Stat label="On buildings" value={String(onBuildings)} testId="stat-on-buildings" />
          <Stat label="Starters" value={`${plan.starters.length}/${MAX_STARTERS}`} testId="stat-starters" />
          <Stat label="Reserves" value={`${plan.reserves.length}/${MAX_RESERVES}`} testId="stat-reserves" />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Team power <span data-testid="stat-power" className="font-mono text-[var(--sand)]">{formatPower(totalPower([...plan.starters, ...plan.reserves], members))}</span>
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <Conflicts conflicts={conflicts} team={team} onOpenBuilding={onOpenBuilding} onGoto={onGoto} />
        <section data-testid="unassigned-section" className="box">
          <div className="flex items-center gap-2">
            <UserRoundX className={`size-4 ${unassigned.length ? "text-[var(--gold)]" : "text-emerald-400"}`} />
            <p className="eyebrow flex-1">Not in any team</p>
            <span data-testid="unassigned-count" className="font-head text-lg font-bold text-[var(--gold)]">{members.length ? `${unassigned.length}/${members.length}` : "—"}</span>
          </div>
          {members.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">Add your alliance members to track who still needs a team.</p>
          ) : unassigned.length === 0 ? (
            <p data-testid="all-assigned-msg" className="mt-2 text-xs text-emerald-400">Every member is in Team A or Team B.</p>
          ) : (
            <ul className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {unassigned.map((n) => <li key={n} data-testid={`unassigned-member-${slug(n)}`} className="chip chip-static">{n}</li>)}
            </ul>
          )}
          <Button variant="ghost" size="sm" data-testid="goto-members-btn" onClick={() => onGoto("members")} className="mt-2 h-8 px-2 text-xs text-[var(--gold)] hover:bg-[var(--gold)]/10">
            <Users className="size-3.5" /> Manage members
          </Button>
        </section>
        <ul className="space-y-1">
          {STRUCTURES.map((s) => {
            const a = plan.assignments[s.id];
            const on = hasAssignment(a);
            const count = a ? a.players.filter(cleanName).length : 0;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  data-testid={`open-building-${s.id}`}
                  onClick={() => onOpenBuilding(s.id)}
                  className={`flex min-h-12 w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left transition-colors duration-200 ${on ? "border-[var(--line-strong)] bg-[var(--panel-2)]" : "border-transparent hover:bg-white/[0.03]"}`}
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ background: on ? color : "#5a4d3d" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--text)]">{s.name}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-[var(--muted)]">
                      {cleanName(a?.leader) ? <><Crown className="size-3 text-[var(--gold)]" /> {cleanName(a.leader)}</> : on ? "No leader yet" : "Empty"}
                    </span>
                  </span>
                  {count > 0 && <span className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-[var(--sand)]">+{count}</span>}
                  <ChevronRight className="size-4 text-[var(--muted)]" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t border-[var(--line)] p-3">
        <Button variant="ghost" data-testid="clear-team-btn" className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" /> Clear {teamTitle(team)}
        </Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent data-testid="clear-team-dialog" className="panel-dialog">
          <DialogHeader>
            <DialogTitle>Clear {teamTitle(team)}?</DialogTitle>
            <DialogDescription>Building assignments, starters and reserves of this team will be removed. The other team and the member list are not affected.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" data-testid="clear-team-cancel">Cancel</Button></DialogClose>
            <Button variant="destructive" data-testid="clear-team-confirm" onClick={() => { actions.clearTeam(team); setConfirm(false); toast.success(`${teamTitle(team)} cleared`); }}>Clear team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Conflicts({ conflicts, team, onOpenBuilding, onGoto }) {
  if (!conflicts.length) return null;
  return (
    <section data-testid="conflicts-section" className="rounded-md border border-red-500/40 bg-red-500/[0.07] p-3">
      <div className="flex items-center gap-2">
        <TriangleAlert className="size-4 text-red-400" />
        <p className="eyebrow flex-1 !text-red-300">Double assignments</p>
        <span data-testid="conflicts-count" className="font-head text-lg font-bold text-red-400">{conflicts.length}</span>
      </div>
      <ul className="mt-2 max-h-44 space-y-2 overflow-y-auto">
        {conflicts.map((c) => (
          <li key={c.name} data-testid={`conflict-${slug(c.name)}`}>
            <p className="text-sm font-semibold text-red-100">
              {c.name} <span className="text-[11px] font-normal text-red-300">{[c.bothTeams && "in both teams", c.multiBuilding && "on 2+ buildings"].filter(Boolean).join(" · ")}</span>
            </p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {c.placements.map((p, i) => (
                <button
                  key={`${p.team}-${p.id}-${i}`}
                  type="button"
                  disabled={p.team !== team}
                  title={p.team !== team ? `Switch to Team ${p.team} to edit` : "Open"}
                  onClick={() => (p.role === "starter" || p.role === "reserve" ? onGoto("roster") : onOpenBuilding(p.id))}
                  className="rounded border border-red-500/30 px-1.5 py-0.5 text-[11px] text-red-200 enabled:hover:border-red-400 enabled:hover:text-white disabled:opacity-60"
                >
                  {placementLabel(p)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value, testId }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-black/20 px-3 py-2">
      <p className="eyebrow !text-[9px]">{label}</p>
      <p data-testid={testId} className="font-head text-xl font-bold text-[var(--sand)]">{value}</p>
    </div>
  );
}

import { useRef, useState } from "react";
import { ArrowDownUp, Building2, Plus, Scale, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DupNote, NameChips } from "@/components/NameChips";
import BalanceDialog from "@/components/BalanceDialog";
import {
  MAX_RESERVES, MAX_STARTERS, STRUCTURES, STRUCTURE_BY_ID, TEAMS, TEAM_COLOR, cleanName, formatPower, keyOf, placementLabel, slug,
  suggestNames, teamTitle,
} from "@/lib/planner";
import { totalPower } from "@/lib/members";

export default function RosterView(props) {
  const { team, teams, members, actions } = props;
  const [balanceOpen, setBalanceOpen] = useState(false);
  return (
    <div data-testid={`roster-view-${team.toLowerCase()}`} className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow" style={{ color: TEAM_COLOR[team] }}>{teamTitle(team)}</p>
            <h2 className="font-head text-3xl font-extrabold uppercase tracking-tight text-[var(--text)]">Team roster</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Build each team by hand: {MAX_STARTERS} starters and {MAX_RESERVES} reserves.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TEAMS.map((t) => (
              <span key={t} data-testid={`team-power-${t.toLowerCase()}`} className="rounded-md border border-[var(--line)] bg-black/20 px-3 py-1.5 text-xs text-[var(--muted)]">
                <span className="font-bold" style={{ color: TEAM_COLOR[t] }}>Team {t}</span>{" "}
                <span className="font-mono text-[var(--sand)]">{formatPower(totalPower([...teams[t].starters, ...teams[t].reserves], members))}</span>
              </span>
            ))}
            <Button data-testid="balance-teams-btn" onClick={() => setBalanceOpen(true)} className="btn-outline-gold h-10 gap-1.5">
              <Scale className="size-4" /> Balance teams
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <RosterList {...props} list="starters" max={MAX_STARTERS} title="Starters" />
          <RosterList {...props} list="reserves" max={MAX_RESERVES} title="Reserves" />
        </div>
      </div>
      <BalanceDialog open={balanceOpen} onOpenChange={setBalanceOpen} teams={teams} members={members} onApply={(r) => { actions.applyRosters(r); toast.success("Balanced teams applied — you can still edit them"); }} />
    </div>
  );
}

function RosterList({ team, teams, list, max, title, knownNames, unassigned, placements, powerIdx, actions }) {
  const plan = teams[team];
  const names = plan[list];
  const other = list === "starters" ? "reserves" : "starters";
  const [draft, setDraft] = useState("");
  const [focus, setFocus] = useState(false);
  const ref = useRef(null);
  const full = names.length >= max;
  const segments = draft.split(",");
  const pending = segments.slice(0, -1).map(cleanName).filter(Boolean);
  const inTeam = [...plan.starters, ...plan.reserves];
  const hits = focus ? suggestNames(knownNames, segments[segments.length - 1], [...inTeam, ...pending]) : [];

  const add = (raw) => {
    const clean = raw.map(cleanName).filter(Boolean);
    setDraft("");
    if (!clean.length) return;
    const room = max - names.length;
    if (room <= 0) return toast.warning(`${title} are full (${max})`);
    for (const n of clean) {
      const e = placements.get(keyOf(n));
      const clash = e?.placements.filter((p) => p.team !== team) ?? [];
      if (clash.length) toast.warning(`${e.name} is already on ${clash.map(placementLabel).join(", ")}`);
    }
    if (clean.length > room) toast.warning(`Only ${room} added — ${title.toLowerCase()} are limited to ${max}`);
    actions.addToRoster(team, list, clean);
  };

  const buildingsOf = (n) => (placements.get(keyOf(n))?.placements ?? []).filter((p) => p.team === team && (p.role === "leader" || p.role === "player"));

  return (
    <section data-testid={`roster-${list}`} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-head text-xl font-bold uppercase tracking-wide text-[var(--gold)]">{title}</h3>
        <span data-testid={`${list}-count`} className={`rounded px-2 py-0.5 font-mono text-sm ${full ? "bg-[var(--gold)] text-[#1A1612]" : "bg-black/30 text-[var(--sand)]"}`}>{names.length}/{max}</span>
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(draft.split(",")); }}>
        <Input
          ref={ref}
          data-testid={`${list}-input`}
          placeholder={full ? `${title} full` : "Name (comma for several)"}
          disabled={full}
          value={draft}
          autoComplete="off"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => setDraft(e.target.value)}
          className="field h-10"
        />
        <Button type="submit" data-testid={`${list}-add-btn`} className="btn-gold h-10 px-3" disabled={!draft.trim() || full}>
          <Plus className="size-4" /> Add
        </Button>
      </form>
      <NameChips testId={`${list}-suggestions`} names={hits} onPick={(n) => { add([...pending, n]); ref.current?.focus(); }} powerIdx={powerIdx} />
      {!draft.trim() && !full && <NameChips testId={`${list}-unassigned`} label="Not in a team" names={unassigned.slice(0, 12)} onPick={(n) => add([n])} powerIdx={powerIdx} />}
      <ol className="mt-3 space-y-1.5">
        {names.map((n, i) => {
          const m = powerIdx.get(keyOf(n));
          const bs = buildingsOf(n);
          return (
            <li key={`${n}-${i}`} data-testid={`${list}-row-${slug(n)}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5">
              <span className="w-5 text-right font-mono text-[10px] text-[var(--muted)]">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">
                {n}
                {m?.squad && <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">{m.squad}</span>}
              </span>
              {bs.map((p, j) => (
                <span key={j} className="hidden rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-[var(--sand)] sm:inline">{STRUCTURE_BY_ID[p.id]?.name}</span>
              ))}
              <span className="w-12 text-right font-mono text-[11px] text-[var(--sand)]">{formatPower(m?.power)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`${list}-assign-btn-${i}`} aria-label={`Put ${n} on a building`} className="size-8 text-[var(--gold)] hover:bg-[var(--gold)]/10">
                    <Building2 className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel>Put {n} on…</DropdownMenuLabel>
                  {STRUCTURES.map((s) => (
                    <DropdownMenuItem key={s.id} data-testid={`${list}-assign-${i}-to-${s.id}`} onClick={() => { actions.addPlayers(team, s.id, [n]); toast.success(`${n} added to ${s.name}`); }}>
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost" size="icon" data-testid={`${list}-move-btn-${i}`} aria-label={`Move ${n} to ${other}`} title={`Move to ${other}`}
                onClick={() => {
                  const cap = other === "starters" ? MAX_STARTERS : MAX_RESERVES;
                  if (plan[other].length >= cap) return toast.warning(`${other} are full (${cap})`);
                  actions.moveInRoster(team, n, other);
                }}
                className="size-8 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
              >
                <ArrowDownUp className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" data-testid={`${list}-remove-btn-${i}`} aria-label={`Remove ${n}`} onClick={() => actions.removeFromRoster(team, n)} className="size-8 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400">
                <UserMinus className="size-4" />
              </Button>
              <DupNote name={n} placements={placements} team={team} id={list} testId={`${list}-dup-${i}`} crossOnly />
            </li>
          );
        })}
        {names.length === 0 && <li className="rounded-md border border-dashed border-[var(--line)] px-3 py-6 text-center text-xs text-[var(--muted)]">No {title.toLowerCase()} yet.</li>}
      </ol>
    </section>
  );
}

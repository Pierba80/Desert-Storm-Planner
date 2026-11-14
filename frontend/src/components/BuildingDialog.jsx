import { useRef, useState } from "react";
import { Crown, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DupNote, NameChips } from "@/components/NameChips";
import {
  STRUCTURE_BY_ID, TEAM_COLOR, cleanName, emptyAssignment, formatPower, keyOf, placementLabel, suggestNames, teamFreeNames,
} from "@/lib/planner";

export default function BuildingDialog({ open, onOpenChange, ...rest }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="building-dialog" className="panel-dialog max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {rest.id && <Editor key={`${rest.team}-${rest.id}`} onClose={() => onOpenChange(false)} {...rest} />}
      </DialogContent>
    </Dialog>
  );
}

function Editor({ team, id, teams, knownNames, unassigned, placements, powerIdx, actions, onClose }) {
  const def = STRUCTURE_BY_ID[id];
  const a = teams[team].assignments[id] ?? emptyAssignment();
  const [draft, setDraft] = useState("");
  const [leaderFocus, setLeaderFocus] = useState(false);
  const [playerFocus, setPlayerFocus] = useState(false);
  const playerRef = useRef(null);
  const here = [a.leader, ...a.players];
  const segments = draft.split(",");
  const pending = segments.slice(0, -1).map(cleanName).filter(Boolean);
  const leaderHits = leaderFocus ? suggestNames(knownNames, a.leader, here) : [];
  const playerHits = playerFocus ? suggestNames(knownNames, segments[segments.length - 1], [...here, ...pending]) : [];
  const hereKeys = new Set(here.map(keyOf));
  const teamFree = teamFreeNames(team, teams).filter((n) => !hereKeys.has(keyOf(n)));
  const color = TEAM_COLOR[team];

  const register = (names) => {
    const added = [], full = [], clashes = [];
    for (const n of names) {
      const e = placements.get(keyOf(n));
      const clash = e?.placements.filter((p) => p.team !== team || p.role === "leader" || p.role === "player") ?? [];
      if (clash.length) clashes.push(`${e.name} (${clash.map(placementLabel).join(", ")})`);
      const r = actions.ensureInRoster(team, n);
      if (r === "starters") added.push(cleanName(n));
      if (r === "full") full.push(cleanName(n));
    }
    if (clashes.length) toast.warning(`Already placed: ${clashes.join("; ")}`);
    if (added.length) toast(`Added to Team ${team} starters: ${added.join(", ")}`);
    if (full.length) toast.warning(`Team ${team} starters are full (20) — not in roster: ${full.join(", ")}`);
  };
  const addNames = (names) => {
    const clean = names.map(cleanName).filter(Boolean).filter((n) => !hereKeys.has(keyOf(n)));
    setDraft("");
    if (!clean.length) return;
    actions.addPlayers(team, id, clean);
    register(clean);
  };
  const setLeader = (n) => {
    actions.setLeader(team, id, n);
    setLeaderFocus(false);
    register([n]);
  };

  return (
    <div className="space-y-5" data-testid="building-editor">
      <DialogHeader className="text-left">
        <span className="eyebrow" style={{ color }}>Team {team} · Building</span>
        <DialogTitle data-testid="building-dialog-name" className="font-head text-3xl font-extrabold uppercase tracking-tight text-[var(--gold)]">
          {def.name}
        </DialogTitle>
        <DialogDescription className="text-[var(--muted)]">Set the leader and the players defending or attacking {def.name}.</DialogDescription>
      </DialogHeader>

      <section className="space-y-2">
        <label htmlFor="leader-input" className="eyebrow flex items-center gap-1.5"><Crown className="size-3.5" /> Leader</label>
        <Input
          id="leader-input"
          data-testid="leader-input"
          placeholder="Leader name"
          value={a.leader}
          autoComplete="off"
          onFocus={() => setLeaderFocus(true)}
          onBlur={() => {
            setLeaderFocus(false);
            if (cleanName(a.leader)) register([a.leader]);
          }}
          onChange={(e) => actions.setLeader(team, id, e.target.value)}
          className="field h-11 font-plate text-base font-bold"
        />
        <NameChips testId="leader-suggestions" names={leaderHits} onPick={setLeader} powerIdx={powerIdx} />
        {!cleanName(a.leader) && !leaderFocus && (
          <NameChips testId="leader-team-suggestions" label={`Team ${team} free`} names={teamFree.slice(0, 8)} onPick={setLeader} powerIdx={powerIdx} />
        )}
        <div className="flex flex-wrap"><DupNote name={a.leader} placements={placements} team={team} id={id} testId="leader-dup-warning" /></div>
      </section>

      <section className="space-y-2">
        <label htmlFor="player-input" className="eyebrow flex items-center gap-1.5"><Users className="size-3.5" /> Players ({a.players.length})</label>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addNames(draft.split(",")); }}>
          <Input
            id="player-input"
            ref={playerRef}
            data-testid="player-input"
            placeholder="Name (comma for several)"
            value={draft}
            autoComplete="off"
            onFocus={() => setPlayerFocus(true)}
            onBlur={() => setPlayerFocus(false)}
            onChange={(e) => setDraft(e.target.value)}
            className="field h-11"
          />
          <Button type="submit" data-testid="add-player-btn" className="btn-gold h-11 px-4" disabled={!draft.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </form>
        <NameChips testId="player-suggestions" names={playerHits} onPick={(n) => { addNames([...pending, n]); playerRef.current?.focus(); }} powerIdx={powerIdx} />
        {!draft.trim() && (
          <>
            <NameChips testId="team-free-suggestions" label={`Team ${team} not on a building`} names={teamFree.slice(0, 14)} onPick={(n) => addNames([n])} powerIdx={powerIdx} />
            <NameChips testId="unassigned-suggestions" label="Unassigned members" names={unassigned.filter((n) => !hereKeys.has(keyOf(n))).slice(0, 10)} onPick={(n) => addNames([n])} powerIdx={powerIdx} />
          </>
        )}
        <ul className="space-y-1.5 pt-1" data-testid="player-list">
          {a.players.map((pl, i) => (
            <li key={`${pl}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5">
              <span className="w-5 text-right font-mono text-[10px] text-[var(--muted)]">{String(i + 1).padStart(2, "0")}</span>
              <span data-testid={`player-name-${i}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">{pl}</span>
              <span className="font-mono text-[11px] text-[var(--muted)]">{formatPower(powerIdx.get(keyOf(pl))?.power)}</span>
              <Button variant="ghost" size="icon" data-testid={`remove-player-btn-${i}`} aria-label={`Remove ${pl}`} onClick={() => actions.removePlayer(team, id, i)} className="size-8 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400">
                <UserMinus className="size-4" />
              </Button>
              <DupNote name={pl} placements={placements} team={team} id={id} testId={`player-dup-warning-${i}`} />
            </li>
          ))}
          {a.players.length === 0 && (
            <li className="rounded-md border border-dashed border-[var(--line)] px-3 py-4 text-center text-xs text-[var(--muted)]">No players yet.</li>
          )}
        </ul>
      </section>

      <div className="flex gap-2 border-t border-[var(--line)] pt-4">
        <Button
          variant="ghost"
          data-testid="clear-building-btn"
          className="flex-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={() => { actions.clearBuilding(team, id); toast(`${def.name} cleared for Team ${team}`); onClose(); }}
        >
          <Trash2 className="size-4" /> Clear building
        </Button>
        <Button data-testid="building-done-btn" className="btn-gold flex-1" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

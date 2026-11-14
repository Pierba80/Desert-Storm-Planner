import { useState } from "react";
import { ClipboardPaste, Plus, Trash2, Users, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SQUAD_TYPES, TEAM_COLOR, dedupeMembers, formatPower, keyOf, slug } from "@/lib/planner";
import { parseMemberLines, parsePower } from "@/lib/members";

export default function MembersView({ members, placements, actions }) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [sort, setSort] = useState("power");
  const [name, setName] = useState("");
  const [power, setPower] = useState("");
  const [squad, setSquad] = useState("");
  const dupCount = members.length - dedupeMembers(members).length;
  const rows = members.map((m, i) => ({ m, i }));
  if (sort === "power") rows.sort((a, b) => (Number(b.m.power) || 0) - (Number(a.m.power) || 0));
  if (sort === "name") rows.sort((a, b) => a.m.name.localeCompare(b.m.name));

  const update = (i, patch) => actions.setMembersRaw(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const addOne = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (members.some((m) => keyOf(m.name) === keyOf(name))) return toast.warning(`${name.trim()} is already in the list`);
    actions.setMembers([...members, { name: name.trim(), power: parsePower(power), squad }]);
    setName(""); setPower(""); setSquad("");
  };

  return (
    <div data-testid="members-view" className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Alliance</p>
            <h2 className="font-head text-3xl font-extrabold uppercase tracking-tight text-[var(--text)]">Members <span data-testid="members-count" className="text-[var(--gold)]">{members.length}</span></h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Name, power and squad type — shared by Team A and Team B.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button data-testid="paste-members-btn" className="btn-gold h-10 gap-1.5" onClick={() => setPasteOpen(true)}><ClipboardPaste className="size-4" /> Paste list</Button>
            <Button data-testid="dedupe-members-btn" variant="outline" className="btn-outline-gold h-10 gap-1.5" disabled={dupCount === 0} onClick={() => { actions.setMembers(members); toast.success(`${dupCount} duplicate${dupCount > 1 ? "s" : ""} removed`); }}>
              <Wand2 className="size-4" /> Remove duplicates{dupCount > 0 ? ` (${dupCount})` : ""}
            </Button>
          </div>
        </div>

        <form onSubmit={addOne} className="mt-5 grid grid-cols-[1fr_90px] gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 sm:grid-cols-[1fr_110px_150px_auto]">
          <Input data-testid="member-name-input" placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} className="field h-10" />
          <Input data-testid="member-power-input" placeholder="Power (M)" value={power} onChange={(e) => setPower(e.target.value)} className="field h-10" />
          <SquadSelect value={squad} onChange={setSquad} testId="member-squad-select" />
          <Button type="submit" data-testid="member-add-btn" className="btn-gold h-10" disabled={!name.trim()}><Plus className="size-4" /> Add</Button>
        </form>

        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          Sort:
          {["power", "name", "added"].map((s) => (
            <button key={s} type="button" data-testid={`members-sort-${s}`} onClick={() => setSort(s)} className={`rounded px-2 py-1 uppercase tracking-wider ${sort === s ? "bg-[var(--gold)]/15 text-[var(--gold)]" : "hover:text-[var(--text)]"}`}>{s}</button>
          ))}
        </div>

        <ul data-testid="members-list" className="mt-2 space-y-1.5">
          {rows.map(({ m, i }) => {
            const teams = [...new Set((placements.get(keyOf(m.name))?.placements ?? []).map((p) => p.team))];
            return (
              <li key={i} data-testid={`member-row-${slug(m.name || String(i))}`} className="grid grid-cols-[1fr_80px_auto] items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 sm:grid-cols-[1fr_100px_140px_70px_auto]">
                <Input aria-label="Name" data-testid={`member-name-${i}`} value={m.name} onChange={(e) => update(i, { name: e.target.value })} className="field h-9 font-semibold" />
                <Input
                  aria-label="Power"
                  data-testid={`member-power-${i}`}
                  defaultValue={m.power ?? ""}
                  key={`p-${m.power}`}
                  placeholder="—"
                  onBlur={(e) => update(i, { power: parsePower(e.target.value) })}
                  className="field h-9 font-mono"
                />
                <div className="hidden sm:block"><SquadSelect value={m.squad} onChange={(v) => update(i, { squad: v })} testId={`member-squad-${i}`} /></div>
                <span className="hidden gap-1 sm:flex">
                  {teams.length ? teams.map((t) => <span key={t} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: TEAM_COLOR[t] }}>{t}</span>) : <span className="text-[10px] text-[var(--muted)]">no team</span>}
                </span>
                <Button variant="ghost" size="icon" data-testid={`member-remove-${i}`} aria-label={`Remove ${m.name}`} onClick={() => actions.setMembersRaw(members.filter((_, j) => j !== i))} className="size-9 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
          {members.length === 0 && (
            <li className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[var(--line)] px-4 py-12 text-center text-sm text-[var(--muted)]">
              <Users className="size-6 text-[var(--gold)]" /> No members yet — paste your alliance list to start.
            </li>
          )}
        </ul>
        <p className="mt-3 text-xs text-[var(--muted)]">Power is in millions (e.g. 45.2 = 45.2M). {members.length ? `Total ${formatPower(members.reduce((s, m) => s + (Number(m.power) || 0), 0))}` : ""}</p>
      </div>
      <PasteDialog open={pasteOpen} onOpenChange={setPasteOpen} onSave={(list, replace) => {
        const next = replace ? list : [...members, ...list];
        actions.setMembers(next);
        setPasteOpen(false);
        toast.success(`${list.length} members imported`);
      }} />
    </div>
  );
}

function SquadSelect({ value, onChange, testId }) {
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger data-testid={testId} className="field h-9"><SelectValue placeholder="Squad type" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No type</SelectItem>
        {SQUAD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function PasteDialog({ open, onOpenChange, onSave }) {
  const [text, setText] = useState("");
  const parsed = parseMemberLines(text);
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setText(""); }}>
      <DialogContent data-testid="paste-dialog" className="panel-dialog sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="font-head text-2xl font-extrabold uppercase text-[var(--gold)]">Paste member list</DialogTitle>
          <DialogDescription className="text-[var(--muted)]">One player per line: name, power, squad type. Power and type are optional. Duplicates are removed automatically.</DialogDescription>
        </DialogHeader>
        <Textarea data-testid="paste-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Rex, 52.4M, Tank\nNova, 48.1, Aircraft\nBlaze 39.7M Missile"} className="field min-h-48 font-mono text-sm" />
        <p data-testid="paste-count" className="text-xs text-[var(--muted)]">{parsed.length} players detected{parsed.length ? ` · ${parsed.filter((p) => p.power != null).length} with power` : ""}</p>
        <DialogFooter className="gap-2">
          <DialogClose asChild><Button variant="outline" data-testid="paste-cancel-btn">Cancel</Button></DialogClose>
          <Button variant="outline" data-testid="paste-replace-btn" className="btn-outline-gold" disabled={!parsed.length} onClick={() => { onSave(parsed, true); setText(""); }}>Replace list</Button>
          <Button data-testid="paste-add-btn" className="btn-gold" disabled={!parsed.length} onClick={() => { onSave(parsed, false); setText(""); }}>Add to list</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

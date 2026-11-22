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
  const [totalPower, setTotalPower] = useState("");
  const [squad, setSquad] = useState("");
  const dupCount = members.length - dedupeMembers(members).length;
  const rows = members.map((m, i) => ({ m, i }));
  if (sort === "power") rows.sort((a, b) => (Number(b.m.power) || 0) - (Number(a.m.power) || 0));
  if (sort === "name") rows.sort((a, b) => a.m.name.localeCompare(b.m.name));

  const update = (i, patch) => actions.setMembersRaw(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const addOne = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (members.some((m) => keyOf(m.name) === keyOf(name))) return toast.warning(name.trim() + " is already in the list");
    actions.setMembers([...members, { name: name.trim(), power: parsePower(power), totalPower: parsePower(totalPower), squad }]);
    setName(""); setPower(""); setTotalPower(""); setSquad("");
  };
const normSquadFromImport = (sq) => {
    const s = String(sq ?? "").trim().toLowerCase();
    if (s === "tank") return "Tank";
    if (s === "aircraft") return "Aircraft";
    if (s === "missile") return "Missile";
    if (s === "mixed") return "Mixed";
    return "";
  };


  const exportRosterFile = () => {
    const profiles = {};
    members.forEach((m) => {
      profiles[keyOf(m.name)] = {
        avatar: m.avatar || "🎖️",
        power: m.power != null ? String(m.power) : "",
        totalPower: m.totalPower != null ? String(m.totalPower) : "",
        squad: String(m.squad || "tank").toLowerCase(),
      };
    });
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      members: members.map((m) => m.name),
      profiles,
      roster: members,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alliance-roster.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.success("Roster file downloaded (" + members.length + " players)");
  };


  const importRosterFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        let imported = [];
        if (Array.isArray(data.roster)) {
          imported = data.roster.map((m) => ({
            name: String(m.name ?? "").trim(),
            power: parsePower(m.power),
            totalPower: parsePower(m.totalPower),
            squad: normSquadFromImport(m.squad),
            avatar: m.avatar || "🎖️",
          }));
        } else if (Array.isArray(data.members)) {
          const profs = data.profiles && typeof data.profiles === "object" ? data.profiles : {};
          imported = data.members.map((rawName) => {
            const clean = String(rawName ?? "").trim();
            const p = profs[clean] || profs[clean.toLowerCase()] || {};
            return {
              name: clean,
              power: parsePower(p.power),
              totalPower: parsePower(p.totalPower),
              squad: normSquadFromImport(p.squad),
              avatar: p.avatar || "🎖️",
            };
          });
        } else {
          throw new Error("invalid file");
        }
        const valid = imported.filter((m) => m.name);
        actions.setMembers(valid);
        toast.success("Imported " + valid.length + " players!");
      } catch {
        toast.error("Invalid roster file");
      }
    };
    reader.readAsText(file);
  };


  const exportRosterPng = async () => {
    if (members.length === 0) return;
    const sorted = [...members]
      .map((m) => {
        const num = Number(m.power);
        const valid = !Number.isNaN(num) && num > 0;
        const totNum = Number(m.totalPower);
        const totValid = !Number.isNaN(totNum) && totNum > 0;
        return {
          name: m.name,
          power: valid ? num : 0,
          powerLabel: valid ? num + "M" + (totValid ? "/" + totNum + "M" : "") : "-",
          squad: m.squad || "",
          avatar: m.avatar || "🎖️",
        };
      })
      .sort((a, b) => b.power - a.power);


    const cols = 4;
    const perCol = 25;
    const colW = 285;
    const gapX = 10;
    const rowH = 38;
    const headH = 66;
    const pad = 16;
    const w = pad * 2 + cols * colW + (cols - 1) * gapX;
    const h = pad * 2 + headH + perCol * rowH;


    const canvas = document.createElement("canvas");
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);


    ctx.fillStyle = "#0F1218";
    ctx.fillRect(0, 0, w, h);


    const totalPow = sorted.reduce((s, r) => s + r.power, 0);
    ctx.fillStyle = "#F5B841";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("ALLIANCE ROSTER", pad, pad + 24);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "13px sans-serif";
    ctx.fillText("Players: " + sorted.length + " | 1st Squad Total: " + (Math.round(totalPow * 10) / 10) + "M", pad, pad + 46);


    const badgeColor = {
      Tank: "#2563EB",
      Aircraft: "#7C3AED",
      Missile: "#DC2626",
      Mixed: "#D97706",
    };


    Array.from({ length: 100 }, (_, i) => sorted.at(i) ?? null).forEach((r, i) => {
      const c = Math.floor(i / perCol);
      const row = i % perCol;
      const x = pad + c * (colW + gapX);
      const y = pad + headH + row * rowH;


      ctx.fillStyle = row % 2 === 0 ? "#1A1F2B" : "#141822";
      ctx.fillRect(x, y, colW, rowH - 3);
      ctx.strokeStyle = "rgba(245,184,65,0.2)";
      ctx.strokeRect(x, y, colW, rowH - 3);


      ctx.fillStyle = "#64748B";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("#" + (i + 1), x + 7, y + 23);


      if (!r) return;


      ctx.font = "18px sans-serif";
      ctx.fillText(r.avatar.startsWith("data:") ? "🎖️" : r.avatar, x + 36, y + 25);


      ctx.fillStyle = "#F8FAFC";
      ctx.font = "bold 12px sans-serif";
      const shortName = r.name.length > 12 ? r.name.slice(0, 11) + "..." : r.name;
      ctx.fillText(shortName, x + 66, y + 23);


      ctx.fillStyle = "#F5B841";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(r.powerLabel, x + 146, y + 23);


      if (r.squad) {
        ctx.fillStyle = badgeColor[r.squad] || "#334155";
        ctx.fillRect(x + 212, y + 7, 66, 20);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(r.squad.toUpperCase(), x + 216, y + 24);
      }
    });


    const link = document.createElement("a");
    link.download = "alliance-roster.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Roster PNG exported (" + sorted.length + " players)");
  };
  return (
    <div data-testid="members-view" className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Alliance</p>
            <h2 className="font-head text-3xl font-extrabold uppercase tracking-tight text-[var(--text)]">Members <span data-testid="members-count" className="text-[var(--gold)]">{members.length}</span></h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Name, 1st squad power, total power and squad type — shared by Team A and Team B.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="btn-outline-gold h-10" disabled={members.length === 0} onClick={exportRosterPng}>PNG</Button>
            <Button type="button" variant="outline" className="btn-outline-gold h-10" disabled={members.length === 0} onClick={exportRosterFile}>Export</Button>
            <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-[var(--gold)]/40 px-3 text-sm font-medium text-[var(--gold)] hover:bg-[var(--gold)]/10">
              Import
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.item(0) ?? undefined;
                  importRosterFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <Button data-testid="paste-members-btn" className="btn-gold h-10 gap-1.5" onClick={() => setPasteOpen(true)}><ClipboardPaste className="size-4" /> Paste list</Button>
            <Button data-testid="dedupe-members-btn" variant="outline" className="btn-outline-gold h-10 gap-1.5" disabled={dupCount === 0} onClick={() => { actions.setMembers(members); toast.success(dupCount + " duplicate" + (dupCount > 1 ? "s" : "") + " removed"); }}>
              <Wand2 className="size-4" /> Remove duplicates{dupCount > 0 ? " (" + dupCount + ")" : ""}
            </Button>
          </div>
        </div>

        <form onSubmit={addOne} className="mt-5 grid grid-cols-[1fr_85px_85px] gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 sm:grid-cols-[1fr_105px_105px_145px_auto]">
          <Input data-testid="member-name-input" placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} className="field h-10" />
          <Input data-testid="member-power-input" placeholder="1st Squad (M)" value={power} onChange={(e) => setPower(e.target.value)} className="field h-10" />
          <Input data-testid="member-total-power-input" placeholder="Total (M)" value={totalPower} onChange={(e) => setTotalPower(e.target.value)} className="field h-10" />
          <SquadSelect value={squad} onChange={setSquad} testId="member-squad-select" />
          <Button type="submit" data-testid="member-add-btn" className="btn-gold h-10" disabled={!name.trim()}><Plus className="size-4" /> Add</Button>
        </form>
                <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          Sort:
          {["power", "name", "added"].map((s) => (
            <button key={s} type="button" data-testid={"members-sort-" + s} onClick={() => setSort(s)} className={"rounded px-2 py-1 uppercase tracking-wider " + (sort === s ? "bg-[var(--gold)]/15 text-[var(--gold)]" : "hover:text-[var(--text)]")}>{s}</button>
          ))}
        </div>

        <ul data-testid="members-list" className="mt-2 space-y-1.5">
          {rows.map(({ m, i }) => {
            const teams = [...new Set((placements.get(keyOf(m.name))?.placements ?? []).map((p) => p.team))];
            return (
              <li key={i} data-testid={"member-row-" + slug(m.name || String(i))} className="grid grid-cols-[1fr_75px_75px_auto] items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 sm:grid-cols-[1fr_95px_95px_140px_70px_auto]">
                <Input aria-label="Name" data-testid={"member-name-" + i} value={m.name} onChange={(e) => update(i, { name: e.target.value })} className="field h-9 font-semibold" />
                <Input
                  aria-label="1st Squad Power"
                  data-testid={"member-power-" + i}
                  defaultValue={m.power ?? ""}
                  key={"p-" + m.power}
                  placeholder="1st Sq."
                  title="1st Squad Power"
                  onBlur={(e) => update(i, { power: parsePower(e.target.value) })}
                  className="field h-9 font-mono"
                />
                <Input
                  aria-label="Total Power"
                  data-testid={"member-total-power-" + i}
                  defaultValue={m.totalPower ?? ""}
                  key={"tp-" + m.totalPower}
                  placeholder="Total"
                  title="Total Power"
                  onBlur={(e) => update(i, { totalPower: parsePower(e.target.value) })}
                  className="field h-9 font-mono text-amber-300"
                />
                <div className="hidden sm:block"><SquadSelect value={m.squad} onChange={(v) => update(i, { squad: v })} testId={"member-squad-" + i} /></div>
                <span className="hidden gap-1 sm:flex">
                  {teams.length ? teams.map((t) => <span key={t} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: TEAM_COLOR[t] }}>{t}</span>) : <span className="text-[10px] text-[var(--muted)]">no team</span>}
                </span>
                <Button variant="ghost" size="icon" data-testid={"member-remove-" + i} aria-label={"Remove " + m.name} onClick={() => actions.setMembersRaw(members.filter((_, j) => j !== i))} className="size-9 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400">
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
        <p className="mt-3 text-xs text-[var(--muted)]">Power is in millions (e.g. 45.2 = 45.2M). {members.length ? "1st Squad Total: " + formatPower(members.reduce((s, m) => s + (Number(m.power) || 0), 0)) + " · Alliance Total: " + formatPower(members.reduce((s, m) => s + (Number(m.totalPower) || 0), 0)) : ""}</p>
      </div>
      <PasteDialog open={pasteOpen} onOpenChange={setPasteOpen} onSave={(list, replace) => {
        const next = replace ? list : [...members, ...list];
        actions.setMembers(next);
        setPasteOpen(false);
        toast.success(list.length + " members imported");
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
        <p data-testid="paste-count" className="text-xs text-[var(--muted)]">{parsed.length} players detected{parsed.length ? " · " + parsed.filter((p) => p.power != null).length + " with power" : ""}</p>
        <DialogFooter className="gap-2">
          <DialogClose asChild><Button variant="outline" data-testid="paste-cancel-btn">Cancel</Button></DialogClose>
          <Button variant="outline" data-testid="paste-replace-btn" className="btn-outline-gold" disabled={!parsed.length} onClick={() => { onSave(parsed, true); setText(""); }}>Replace list</Button>
          <Button data-testid="paste-add-btn" className="btn-gold" disabled={!parsed.length} onClick={() => { onSave(parsed, false); setText(""); }}>Add to list</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

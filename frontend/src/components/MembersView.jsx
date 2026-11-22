import { useState } from "react";
import { ClipboardPaste, Download, ImageDown, Plus, Trash2, Upload, Users, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AVATAR_PRESETS, SQUAD_TYPES, TEAM_COLOR, cleanName, dedupeMembers, formatPower, keyOf, slug } from "@/lib/planner";
import { parseMemberLines, parsePower } from "@/lib/members";


const SQUAD_LABELS = {
  tank: "Tank",
  aircraft: "Aircraft",
  missile: "Missile",
  mixed: "Mixed",
};


const normalizeSquad = (sq) => {
  if (!sq) return "";
  const lower = String(sq).trim().toLowerCase();
  return SQUAD_LABELS[lower] || SQUAD_TYPES.find((t) => t.toLowerCase() === lower) || "";
};


export default function MembersView({ members, placements, actions }) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [avatarPickerIdx, setAvatarPickerIdx] = useState(null);
  const [sort, setSort] = useState("power");
  const [name, setName] = useState("");
  const [power, setPower] = useState("");
  const [squad, setSquad] = useState("");
  const [avatar, setAvatar] = useState("🎖️");


  const dupCount = members.length - dedupeMembers(members).length;
  const rows = members.map((m, i) => ({ m, i }));
  if (sort === "power") rows.sort((a, b) => (Number(b.m.power) || 0) - (Number(a.m.power) || 0));
  if (sort === "name") rows.sort((a, b) => a.m.name.localeCompare(b.m.name));


  const update = (i, patch) => actions.setMembersRaw(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));


  const resizeImageToDataUrl = (file, cb) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        canvas.getContext("2d")?.drawImage(img, 0, 0, 64, 64);
        cb(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };


  const handleNewAvatarFile = (file) => {
    if (!file) return;
    resizeImageToDataUrl(file, (dataUrl) => setAvatar(dataUrl));
  };


  const handleRowAvatarFile = (i, file) => {
    if (!file) return;
    resizeImageToDataUrl(file, (dataUrl) => {
      update(i, { avatar: dataUrl });
      setAvatarPickerIdx(null);
    });
  };


  const addOne = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (members.some((m) => keyOf(m.name) === keyOf(name))) return toast.warning(`${name.trim()} is already in the list`);
    actions.setMembers([...members, { name: name.trim(), power: parsePower(power), squad, avatar: avatar || "🎖️" }]);
    setName("");
    setPower("");
    setSquad("");
    setAvatar("🎖️");
  };


  const exportRosterFile = () => {
    const profiles = {};
    for (const m of members) {
      const k = keyOf(m.name);
      if (!k) continue;
      profiles[k] = {
        avatar: m.avatar || "🎖️",
        power: m.power != null ? `${m.power}M` : "",
        squad: (m.squad || "tank").toLowerCase(),
      };
    }
    const payload = {
      version: 1,
      source: "desert-storm-planner",
      exportedAt: new Date().toISOString(),
      members: members.map((m) => m.name),
      memberDetails: members,
      profiles,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "desert-alliance-roster.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.success(`Roster file downloaded (${members.length} players)`);
  };


  const importRosterFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        let imported = [];


        if (Array.isArray(data.memberDetails) && data.memberDetails.length > 0) {
          imported = data.memberDetails.map((m) => ({
            name: cleanName(m.name),
            power: m.power ?? null,
            squad: normalizeSquad(m.squad),
            avatar: m.avatar || "🎖️",
          }));
        } else if (Array.isArray(data.members)) {
          const profiles = data.profiles && typeof data.profiles === "object" ? data.profiles : {};
          imported = data.members
            .map((entry) => {
              if (typeof entry === "object" && entry !== null) {
                return {
                  name: cleanName(entry.name),
                  power: entry.power ?? null,
                  squad: normalizeSquad(entry.squad),
                  avatar: entry.avatar || "🎖️",
                };
              }
              const playerName = cleanName(String(entry));
              const prof = profiles[playerName] || profiles[keyOf(playerName)] || {};
              return {
                name: playerName,
                power: parsePower(prof.power),
                squad: normalizeSquad(prof.squad),
                avatar: prof.avatar || "🎖️",
              };
            })
            .filter((m) => m.name);
        } else {
          throw new Error("Invalid roster format");
        }


        actions.setMembers(imported);
        toast.success(`Imported ${dedupeMembers(imported).length} players from roster file`);
      } catch {
        toast.error("Invalid roster file");
      }
    };
    reader.readAsText(file);
  };


  const exportRosterPng = async () => {
    if (members.length === 0) return;
    const sortedRows = [...members]
      .map((m) => {
        const num = parseFloat(String(m.power ?? "").replace(",", "."));
        const valid = !Number.isNaN(num) && num > 0;
        return {
          name: m.name,
          power: valid ? num : 0,
          powerLabel: valid ? `${num}M` : "-",
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


    const totalPow = sortedRows.reduce((s, r) => s + r.power, 0);
    ctx.fillStyle = "#F5B942";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("DESERT STORM — ALLIANCE ROSTER", pad, pad + 24);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "13px sans-serif";
    ctx.fillText(`Players: ${sortedRows.length} | Total Power: ${Math.round(totalPow * 10) / 10}M`, pad, pad + 46);


    const loadImg = (src) =>
      new Promise((res) => {
        if (!src || !src.startsWith("data:")) return res(null);
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = src;
      });


    const imgs = await Promise.all(sortedRows.map((r) => loadImg(r.avatar)));


    const badgeColor = {
      Tank: "#2563EB",
      tank: "#2563EB",
      Aircraft: "#7C3AED",
      aircraft: "#7C3AED",
      Missile: "#DC2626",
      missile: "#DC2626",
      Mixed: "#D97706",
      mixed: "#D97706",
    };


    Array.from({ length: 100 }, (_, i) => sortedRows.at(i) ?? null).forEach((r, i) => {
      const c = Math.floor(i / perCol);
      const row = i % perCol;
      const x = pad + c * (colW + gapX);
      const y = pad + headH + row * rowH;


      ctx.fillStyle = row % 2 === 0 ? "#181D27" : "#131720";
      ctx.fillRect(x, y, colW, rowH - 3);
      ctx.strokeStyle = "rgba(245,185,66,0.22)";
      ctx.strokeRect(x, y, colW, rowH - 3);


      ctx.fillStyle = "#64748B";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`#${i + 1}`, x + 7, y + 23);


      if (!r) return;


      const im = imgs.at(i);
      const avX = x + 36;
      const avY = y + 4;
      const avS = 28;
      if (im) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avS / 2, avY + avS / 2, avS / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(im, avX, avY, avS, avS);
        ctx.restore();
      } else {
        ctx.font = "18px sans-serif";
        ctx.fillText(r.avatar, avX + 3, y + 25);
      }


      ctx.fillStyle = "#F8FAFC";
      ctx.font = "bold 12px sans-serif";
      const shortName = r.name.length > 13 ? r.name.slice(0, 12) + "..." : r.name;
      ctx.fillText(shortName, x + 70, y + 23);


      ctx.fillStyle = "#F5B942";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(r.powerLabel, x + 165, y + 23);


      if (r.squad) {
        ctx.fillStyle = badgeColor[r.squad] || "#334155";
        ctx.fillRect(x + 212, y + 7, 66, 20);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(r.squad.toUpperCase(), x + 216, y + 21);
      }
    });


    const link = document.createElement("a");
    link.download = "desert-alliance-roster.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success(`Roster PNG exported (${sortedRows.length} players)`);
  };

return (
    <div data-testid="members-view" className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Alliance</p>
            <h2 className="font-head text-3xl font-extrabold uppercase tracking-tight text-[var(--text)]">
              Members <span data-testid="members-count" className="text-[var(--gold)]">{members.length}</span>
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Avatar, name, power and squad type — shared by Team A and Team B.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button data-testid="export-png-btn" variant="outline" className="btn-outline-gold h-10 gap-1.5" disabled={members.length === 0} onClick={exportRosterPng}>
              <ImageDown className="size-4" /> PNG
            </Button>
            <Button data-testid="export-roster-btn" variant="outline" className="btn-outline-gold h-10 gap-1.5" disabled={members.length === 0} onClick={exportRosterFile}>
              <Download className="size-4" /> Export
            </Button>
            <label className="btn-outline-gold inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--gold)]/40 px-3 text-sm font-medium text-[var(--gold)] hover:bg-[var(--gold)]/10">
              <Upload className="size-4" /> Import
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
            <Button data-testid="paste-members-btn" className="btn-gold h-10 gap-1.5" onClick={() => setPasteOpen(true)}>
              <ClipboardPaste className="size-4" /> Paste list
            </Button>
            <Button
              data-testid="dedupe-members-btn"
              variant="outline"
              className="btn-outline-gold h-10 gap-1.5"
              disabled={dupCount === 0}
              onClick={() => {
                actions.setMembers(members);
                toast.success(`${dupCount} duplicate${dupCount > 1 ? "s" : ""} removed`);
              }}
            >
              <Wand2 className="size-4" /> Remove duplicates{dupCount > 0 ? ` (${dupCount})` : ""}
            </Button>
          </div>
        </div>


        <form onSubmit={addOne} className="mt-5 grid grid-cols-[auto_1fr_90px] gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 sm:grid-cols-[auto_1fr_110px_150px_auto]">
          <label
            title="Upload avatar photo"
            className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--gold)]/50 bg-[var(--panel-2)] text-lg hover:border-[var(--gold)]"
          >
            {avatar?.startsWith("data:") ? <img src={avatar} alt="Avatar" className="size-full object-cover" /> : avatar}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleNewAvatarFile(e.target.files?.[0])} />
          </label>
          <Input data-testid="member-name-input" placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} className="field h-10" />
          <Input data-testid="member-power-input" placeholder="Power (M)" value={power} onChange={(e) => setPower(e.target.value)} className="field h-10" />
          <SquadSelect value={squad} onChange={setSquad} testId="member-squad-select" />
          <Button type="submit" data-testid="member-add-btn" className="btn-gold h-10" disabled={!name.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </form>


        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          Sort:
          {["power", "name", "added"].map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`members-sort-${s}`}
              onClick={() => setSort(s)}
              className={`rounded px-2 py-1 uppercase tracking-wider ${sort === s ? "bg-[var(--gold)]/15 text-[var(--gold)]" : "hover:text-[var(--text)]"}`}
            >
              {s}
            </button>
          ))}
        </div>


        <ul data-testid="members-list" className="mt-2 space-y-1.5">
          {rows.map(({ m, i }) => {
            const teams = [...new Set((placements.get(keyOf(m.name))?.placements ?? []).map((p) => p.team))];
            const currentAvatar = m.avatar || "🎖️";
            const isImg = currentAvatar.startsWith("data:");
            const pickerOpen = avatarPickerIdx === i;


            return (
              <li
                key={i}
                data-testid={`member-row-${slug(m.name || String(i))}`}
                className="rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5"
              >
                <div className="grid grid-cols-[auto_1fr_80px_auto] items-center gap-2 sm:grid-cols-[auto_1fr_100px_140px_70px_auto]">
                  <button
                    type="button"
                    title="Change avatar or upload photo"
                    onClick={() => setAvatarPickerIdx(pickerOpen ? null : i)}
                    className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--gold)]/40 bg-[var(--panel)] text-base hover:border-[var(--gold)]"
                  >
                    {isImg ? <img src={currentAvatar} alt={m.name} className="size-full object-cover" /> : currentAvatar}
                  </button>
                  <Input
                    aria-label="Name"
                    data-testid={`member-name-${i}`}
                    value={m.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="field h-9 font-semibold"
                  />
                  <Input
                    aria-label="Power"
                    data-testid={`member-power-${i}`}
                    defaultValue={m.power ?? ""}
                    key={`p-${m.power}`}
                    placeholder="—"
                    onBlur={(e) => update(i, { power: parsePower(e.target.value) })}
                    className="field h-9 font-mono"
                  />
                  <div className="hidden sm:block">
                    <SquadSelect value={m.squad} onChange={(v) => update(i, { squad: v })} testId={`member-squad-${i}`} />
                  </div>
                  <span className="hidden gap-1 sm:flex">
                    {teams.length ? (
                      teams.map((t) => (
                        <span key={t} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: TEAM_COLOR[t] }}>
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">no team</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`member-remove-${i}`}
                    aria-label={`Remove ${m.name}`}
                    onClick={() => actions.setMembersRaw(members.filter((_, j) => j !== i))}
                    className="size-9 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>


                {pickerOpen && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-2">
                    <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded border border-[var(--gold)]/40 bg-[var(--panel)] px-2 text-xs text-[var(--gold)] hover:bg-[var(--gold)]/10">
                      <Upload className="size-3" /> Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleRowAvatarFile(i, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {AVATAR_PRESETS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          update(i, { avatar: em });
                          setAvatarPickerIdx(null);
                        }}
                        className={`flex size-7 items-center justify-center rounded text-sm ${
                          currentAvatar === em ? "bg-[var(--gold)]/30 ring-1 ring-[var(--gold)]" : "hover:bg-white/10"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
          {members.length === 0 && (
            <li className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[var(--line)] px-4 py-12 text-center text-sm text-[var(--muted)]">
              <Users className="size-6 text-[var(--gold)]" /> No members yet — paste your alliance list or import a JSON file to start.
            </li>
          )}
        </ul>
<p className="mt-3 text-xs text-[var(--muted)]">
          Power is in millions (e.g. 45.2 = 45.2M).{" "}
          {members.length ? `Total ${formatPower(members.reduce((s, m) => s + (Number(m.power) || 0), 0))}` : ""}
        </p>
      </div>
      <PasteDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        onSave={(list, replace) => {
          const next = replace ? list : [...members, ...list];
          actions.setMembers(next);
          setPasteOpen(false);
          toast.success(`${list.length} members imported`);
        }}
      />
    </div>
  );
}


function SquadSelect({ value, onChange, testId }) {
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger data-testid={testId} className="field h-9">
        <SelectValue placeholder="Squad type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No type</SelectItem>
        {SQUAD_TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


function PasteDialog({ open, onOpenChange, onSave }) {
  const [text, setText] = useState("");
  const parsed = parseMemberLines(text);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setText("");
      }}
    >
      <DialogContent data-testid="paste-dialog" className="panel-dialog sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="font-head text-2xl font-extrabold uppercase text-[var(--gold)]">Paste member list</DialogTitle>
          <DialogDescription className="text-[var(--muted)]">
            One player per line: name, power, squad type. Power and type are optional. Duplicates are removed automatically.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          data-testid="paste-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Rex, 52.4M, Tank\nNova, 48.1, Aircraft\nBlaze 39.7M Missile"}
          className="field min-h-48 font-mono text-sm"
        />
        <p data-testid="paste-count" className="text-xs text-[var(--muted)]">
          {parsed.length} players detected{parsed.length ? ` · ${parsed.filter((p) => p.power != null).length} with power` : ""}
        </p>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" data-testid="paste-cancel-btn">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="outline"
            data-testid="paste-replace-btn"
            className="btn-outline-gold"
            disabled={!parsed.length}
            onClick={() => {
              onSave(parsed, true);
              setText("");
            }}
          >
            Replace list
          </Button>
          <Button
            data-testid="paste-add-btn"
            className="btn-gold"
            disabled={!parsed.length}
            onClick={() => {
              onSave(parsed, false);
              setText("");
            }}
          >
            Add to list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
        

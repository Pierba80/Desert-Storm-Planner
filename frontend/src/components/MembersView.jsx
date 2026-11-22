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

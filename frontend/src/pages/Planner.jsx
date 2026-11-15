import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CircleHelp, Volume2, VolumeX, Download, ImageUp, LayoutGrid,Map as MapIcon, Move, Printer, RotateCcw, Shuffle, TriangleAlert, Users, UsersRound } from "lucide-react";
import { toast } from "sonner";
import BattleMap from "@/components/BattleMap";
import SidePanel from "@/components/SidePanel";
import BuildingDialog from "@/components/BuildingDialog";
import RosterView from "@/components/RosterView";
import MembersView from "@/components/MembersView";
import HelpDialog from "@/components/HelpDialog";
import PrintRoster from "@/components/PrintRoster";
import BattleCountdown from "@/components/BattleCountdown";
import BattleReminder from "@/components/BattleReminder";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  TEAMS, TEAM_COLOR, dedupeNames, findConflicts, memberIndex, placementsByName, teamTitle, unassignedMembers, useMapImage, usePlanner,
} from "@/lib/planner";
import { battleLabel } from "@/lib/battle";
import { exportTeamPlan, fileToDataUrl } from "@/lib/exportPlan";

function useIsDesktop() {
  const q = "(min-width: 1024px)";
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

const VIEWS = [["map", "Map", MapIcon], ["roster", "Team roster", UsersRound], ["members", "Members", Users]];

export default function Planner() {
  const { state, savedAt, actions } = usePlanner();
  const map = useMapImage();
  const isDesktop = useIsDesktop();
  const [team, setTeam] = useState("A");
  const [view, setView] = useState("map");
  const [buildingId, setBuildingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTeams, setPrintTeams] = useState(TEAMS);
  const fileRef = useRef(null);

  const placements = useMemo(() => placementsByName(state.teams), [state.teams]);
  const conflicts = useMemo(() => findConflicts(placements), [placements]);
  const unassigned = useMemo(() => unassignedMembers(state.members, placements), [state.members, placements]);
  const powerIdx = useMemo(() => memberIndex(state.members), [state.members]);
  const knownNames = useMemo(
    () => dedupeNames([...state.members.map((m) => m.name), ...[...placements.values()].map((v) => v.name)]).sort((a, b) => a.localeCompare(b)),
    [state.members, placements],
  );
  const plan = state.teams[team];
  const shared = { team, teams: state.teams, members: state.members, knownNames, unassigned, placements, powerIdx, actions };

  const openBuilding = (id) => {
    if (editMode) return;
    setView("map");
    setSheetOpen(false);
    setBuildingId(id);
  };

  const doExport = async (t) => {
    setExporting(true);
    const id = toast.loading(`Rendering ${teamTitle(t)}…`);
    try {
      const r = await exportTeamPlan({ team: t, imageSrc: map.src, hotspots: state.hotspots, plateOffsets: state.plateOffsets, plan: state.teams[t], battle: battleLabel(state.battle) });
      toast.success(`${teamTitle(t)} exported (${r.width}×${r.height})`, { id });
    } catch {
      toast.error("Export failed — try a different map image", { id });
    } finally {
      setExporting(false);
    }
  };

  const printRoster = (teams) => {
    flushSync(() => setPrintTeams(teams));
    window.print();
  };

  const onUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    try {
      const saved = map.replace(await fileToDataUrl(file));
      if (saved) toast.success("Map replaced for both teams");
      else toast.warning("Map replaced, but it is too large to save — it will reset on reload");
    } catch {
      toast.error("Could not read that image");
    }
  };

  return (
    <>
      <div className="app-shell flex h-dvh flex-col print:hidden" data-testid="planner-root">
        <header className="relative z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="brand-mark" />
            <span className="font-head text-lg font-extrabold uppercase leading-none tracking-wide text-[var(--gold)]">Desert Storm<span className="hidden text-[var(--sand)] sm:inline"> Planner</span></span>
          </div>
          <div role="tablist" aria-label="Team" className="flex rounded-md border border-[var(--line)] bg-black/30 p-0.5" data-testid="team-tabs">
            {TEAMS.map((t) => (
              <button
                key={t} role="tab" type="button" aria-selected={team === t} data-testid={`team-${t.toLowerCase()}-tab`}
                onClick={() => { setTeam(t); setBuildingId(null); }}
                className={`min-h-9 rounded px-4 font-head text-sm font-bold uppercase tracking-wider transition-[background-color,color] duration-200 ${team === t ? "text-white" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
                style={team === t ? { background: TEAM_COLOR[t] } : undefined}
              >
                Team {t}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <HeaderBtn testId="edit-layout-btn" active={editMode} label={editMode ? "Done editing" : "Edit layout"} onClick={() => { setEditMode((v) => !v); setView("map"); }}><Move className="size-4" /></HeaderBtn>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" data-testid="map-menu-btn" className="hdr-btn h-9 gap-1.5 px-2.5"><ImageUp className="size-4" /> <span className="hidden md:inline">Map</span></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="replace-map-item" onClick={() => fileRef.current?.click()}>Upload / replace map image</DropdownMenuItem>
                <DropdownMenuItem data-testid="restore-map-item" disabled={map.isDefault} onClick={() => { map.reset(); toast("Original map restored"); }}>Restore original map</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-testid="export-menu-btn" disabled={exporting} className="btn-gold h-9 gap-1.5 px-3"><Download className="size-4" /> <span className="hidden sm:inline">Export</span></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {TEAMS.map((t) => <DropdownMenuItem key={t} data-testid={`export-team-${t.toLowerCase()}-item`} onClick={() => doExport(t)}>Export Team {t} image (PNG)</DropdownMenuItem>)}
                <DropdownMenuItem data-testid="export-both-item" onClick={async () => { await doExport("A"); await doExport("B"); }}>Export both teams</DropdownMenuItem>
                <DropdownMenuSeparator />
                {TEAMS.map((t) => <DropdownMenuItem key={`p-${t}`} data-testid={`print-team-${t.toLowerCase()}-item`} onClick={() => printRoster([t])}><Printer className="size-4" /> Print Team {t} roster</DropdownMenuItem>)}
                <DropdownMenuItem data-testid="print-both-item" onClick={() => printRoster(TEAMS)}><Printer className="size-4" /> Print both rosters</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <HeaderBtn testId="help-btn" label="Help" onClick={() => setHelpOpen(true)}><CircleHelp className="size-4" /></HeaderBtn>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="map-upload-input" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-4 pb-2 pt-3 sm:px-6">
              <div className="min-w-0">
                <h1 key={team} data-testid="team-title" className="title-in font-head text-3xl font-extrabold uppercase leading-none tracking-tight text-[var(--text)] sm:text-5xl">
                  Desert Storm <span style={{ color: TEAM_COLOR[team] }}>Team {team}</span>
                </h1>
                <div role="tablist" aria-label="Screen" className="mt-2.5 flex flex-wrap gap-1" data-testid="view-tabs">
                  {VIEWS.map(([v, label, Icon]) => (
                    <button
                      key={v} role="tab" type="button" aria-selected={view === v} data-testid={`view-${v}-tab`}
                      onClick={() => { setView(v); setEditMode(false); }}
                      className={`view-tab ${view === v ? "view-tab-on" : ""}`}
                    >
                      <Icon className="size-3.5" /> {label}
                      {v === "roster" && <span className="font-mono opacity-80">{plan.starters.length}+{plan.reserves.length}</span>}
                      {v === "members" && <span className="font-mono opacity-80">{state.members.length}</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-3">
                <BattleCountdown battle={state.battle} onChange={actions.setBattle} />
                <p data-testid="autosave-status" className="hidden pb-1 text-right text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] sm:block">
                  {savedAt ? <>Saved <span className="text-emerald-400">{savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span></> : "Auto-save on"}
                </p>
              </div>
            </div>
            <BattleReminder battle={state.battle} />
            {editMode && view === "map" && (
              <div data-testid="edit-mode-banner" className="mx-4 mb-2 flex flex-wrap items-center gap-2 rounded-md border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-3 py-2 text-xs text-[var(--sand)] sm:mx-6">
                <Move className="size-4 text-[var(--gold)]" />
                <span className="flex-1">Layout mode — drag the dashed zones onto the buildings and the nameplates where you like. Shared by both teams.</span>
                <Button size="sm" variant="ghost" data-testid="auto-arrange-btn" className="text-[var(--sand)] hover:bg-white/10" onClick={() => { actions.autoPlates(); toast("Nameplates auto-arranged"); }}><Shuffle className="size-3.5" /> Auto-arrange</Button>
                <Button size="sm" variant="ghost" data-testid="reset-layout-btn" className="text-[var(--sand)] hover:bg-white/10" onClick={() => { actions.resetLayout(); toast("Layout reset to defaults"); }}><RotateCcw className="size-3.5" /> Reset</Button>
                <Button size="sm" data-testid="done-editing-btn" className="btn-gold" onClick={() => setEditMode(false)}>Done</Button>
              </div>
            )}
            <div className={`relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden sm:mx-4 ${view === "map" ? "" : "rounded-lg border border-[var(--line)] bg-[var(--panel-2)]"}`}>
              {view === "roster" && <RosterView {...shared} />}
              {view === "members" && <MembersView members={state.members} placements={placements} actions={actions} />}
              {view === "map" && (
                <BattleMap
                  team={team}
                  imageSrc={map.src}
                  hotspots={state.hotspots}
                  plateOffsets={state.plateOffsets}
                  plan={plan}
                  editMode={editMode}
                  onBuildingClick={openBuilding}
                  onHotspotMove={actions.moveHotspot}
                  onPlateMove={actions.movePlate}
                  toolbarExtra={
                    <div className="flex items-center gap-1">
                      {!editMode && Object.keys(state.plateOffsets).length > 0 && (
                        <Button variant="ghost" data-testid="auto-arrange-toolbar-btn" onClick={() => { actions.autoPlates(); toast("Nameplates auto-arranged"); }} className="hdr-btn h-9 gap-1.5 px-2.5 text-xs">
                          <Shuffle className="size-4" /> <span className="hidden sm:inline">Auto-arrange</span>
                        </Button>
                      )}
                      {!isDesktop && (
                        <Button data-testid="open-console-btn" onClick={() => setSheetOpen(true)} className="btn-gold h-9 gap-1.5 px-3">
                          <LayoutGrid className="size-4" /> Buildings
                          {conflicts.length > 0 && <span data-testid="mobile-conflict-badge" className="flex items-center gap-0.5 rounded bg-red-600 px-1.5 text-[11px] font-bold text-white"><TriangleAlert className="size-3" /> {conflicts.length}</span>}
                        </Button>
                      )}
                    </div>
                  }
                />
              )}
            </div>
          </main>
          {isDesktop && (
            <aside className="w-[360px] shrink-0 border-l border-[var(--line)] bg-[var(--panel)]">
              <SidePanel team={team} teams={state.teams} members={state.members} conflicts={conflicts} unassigned={unassigned} actions={actions} onOpenBuilding={openBuilding} onGoto={(v) => { setView(v); setSheetOpen(false); }} />
            </aside>
          )}
        </div>

        {!isDesktop && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" data-testid="console-sheet" className="h-[80dvh] border-t border-[var(--line)] bg-[var(--panel)] p-0 text-[var(--text)]">
              <SheetTitle className="sr-only">Buildings</SheetTitle>
              <SidePanel team={team} teams={state.teams} members={state.members} conflicts={conflicts} unassigned={unassigned} actions={actions} onOpenBuilding={openBuilding} onGoto={(v) => { setView(v); setSheetOpen(false); }} />
            </SheetContent>
          </Sheet>
        )}

        <BuildingDialog open={!!buildingId} onOpenChange={(o) => !o && setBuildingId(null)} id={buildingId} {...shared} />
        <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
        <Toaster richColors theme="dark" position="top-center" />
      </div>
      <PrintRoster teams={printTeams} plans={state.teams} conflicts={conflicts} battle={battleLabel(state.battle)} />
    </>
  );
}

function HeaderBtn({ testId, label, active, onClick, children }) {
  return (
    <Button variant="ghost" data-testid={testId} aria-pressed={active} aria-label={label} title={label} onClick={onClick} className={`hdr-btn h-9 gap-1.5 px-2.5 ${active ? "bg-[var(--gold)]/20 !text-[var(--gold)]" : ""}`}>
      {children}
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );
}

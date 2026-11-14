# Desert Storm Planner — PRD

## Original problem
Planner for the Last War: Survival "Desert Storm" event (from user's repo Pierba80/Desert-Storm-Planner): alliance members, Team A/B (20 starters + 10 reserves), assign players to 11 buildings on the map, nameplates without overlap, export PNG. No login, English UI, localStorage.

## Architecture
Frontend-only React (CRA) at /app/frontend. State in localStorage (`desert_storm_planner_state_v3`, layoutVersion 11). Key files: lib/planner.js (state, hotspots, labels, PLATE_SIDE), lib/layout.js (shared plate layout DOM+export), lib/exportPlan.js (canvas PNG), lib/members.js (paste parse, balance), pages/Planner.jsx.

## Implemented (Jun 2026)
- Map at real ratio 1672×941, 11 buildings with exact names + calibrated positions; blue/red zones ignored
- Building dialog (leader + players, suggestions, double-assignment warnings, auto-add to starters)
- Nameplates: compact (+N), auto-placed with fixed sides per user request (Oil-1/Hospital-1 left; Hospital-2/Oil-2 right; Hospital-3/Tech center below; Info Center/Hospital-4/Arsenal/Mercenary above; Silo auto), no overlap, draggable, auto-arrange
- Edit layout (drag zones), reset; replace/restore map
- Members (name, power, squad type), paste list, dedupe
- Team roster 20+10, conflicts, unassigned count
- Balance teams preview + confirm (players on buildings pinned to their team)
- PNG export per team (3344px wide), print roster, countdown/reminder, help, autosave

## Backlog
- P1: read-only share link for members; Italian UI
- P2: multi-officer login; member event sign-up; JPEG/smaller export option

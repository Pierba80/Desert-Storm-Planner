import { STRUCTURES, cleanName, keyOf, teamTitle } from "@/lib/planner";

// Print-only roster sheet: one page per team.
export default function PrintRoster({ teams, plans, conflicts, battle }) {
  const dup = new Set(conflicts.map((c) => keyOf(c.name)));
  const Name = ({ n }) => <span className={dup.has(keyOf(n)) ? "font-semibold underline decoration-dotted" : ""}>{dup.has(keyOf(n)) ? `⚠ ${n}` : n}</span>;
  const list = (names) => names.length ? names.map((n, i) => <span key={i}><Name n={n} />{i < names.length - 1 ? ", " : ""}</span>) : <span className="text-neutral-400">—</span>;
  return (
    <div data-testid="print-roster" className="hidden print:block">
      {teams.map((t) => {
        const plan = plans[t];
        return (
          <section key={t} className="print-page p-2 text-black">
            <header className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
              <div>
                <p className="text-[9pt] uppercase tracking-[0.25em] text-neutral-600">Roster sheet</p>
                <h1 className="font-head text-[24pt] font-black uppercase leading-none">{teamTitle(t)}</h1>
              </div>
              <div className="text-right text-[9pt] text-neutral-700">
                {battle && <p className="text-[11pt] font-semibold text-black">Battle: {battle}</p>}
                <p>{new Date().toLocaleString()}</p>
              </div>
            </header>
            <table className="w-full border-collapse text-[10pt]">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="w-[24%] py-1.5 pr-2">Building</th>
                  <th className="w-[22%] py-1.5 pr-2">Leader</th>
                  <th className="py-1.5 pr-2">Players</th>
                </tr>
              </thead>
              <tbody>
                {STRUCTURES.map((s) => {
                  const a = plan.assignments[s.id];
                  const leader = cleanName(a?.leader);
                  const players = (a?.players ?? []).map(cleanName).filter(Boolean);
                  return (
                    <tr key={s.id} className="border-b border-neutral-300 align-top">
                      <td className="py-1.5 pr-2 font-semibold">{s.name}</td>
                      <td className="py-1.5 pr-2">{leader ? <Name n={leader} /> : <span className="text-neutral-400">—</span>}</td>
                      <td className="py-1.5 pr-2">{list(players)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[10pt]">
              <div><h2 className="border-b border-black pb-1 font-bold uppercase">Starters ({plan.starters.length})</h2><p className="pt-1.5">{list(plan.starters)}</p></div>
              <div><h2 className="border-b border-black pb-1 font-bold uppercase">Reserves ({plan.reserves.length})</h2><p className="pt-1.5">{list(plan.reserves)}</p></div>
            </div>
            {conflicts.length > 0 && <p className="mt-3 text-[9pt] text-neutral-700">⚠ = player in both teams or on more than one building.</p>}
          </section>
        );
      })}
    </div>
  );
}

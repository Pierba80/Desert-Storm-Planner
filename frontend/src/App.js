import "@/App.css";
import Planner from "@/pages/Planner";

function App() {
  return (
    <>
    <Planner />
    <div className="fixed bottom-2 left-3 z-50 text-xs text-white/60 pointer-events-none select-none">
    @ {new Date().getFullYear()} Pierba - Tutti i diritti riservati
    </div>
    </>
  );
}

export default App;

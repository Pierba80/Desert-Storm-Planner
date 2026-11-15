import "@/App.css";
import Planner from "@/pages/Planner";

function App() {
  return (
    <>
      <Planner />

      {/* Scritta Copyright */}
      <div
        style={{
          position: "fixed",
          bottom: "64px",
          right: "16px",
          zIndex: 99999,
          color: "rgba(255, 255, 255, 0.55)",
          fontSize: "11px",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        © {new Date().getFullYear()} Pīərbâ
      </div>
    </>
  );
}

export default App;

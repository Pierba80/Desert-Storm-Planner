import "@/App.css";
import Planner from "@/pages/Planner";

function App() {
  return (
    <>
      <Planner />
      <div
        style={{
          position: "fixed",
          bottom: "10px",
          left: "12px",
          zIndex: 99999,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          color: "#ffffff",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "12px",
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


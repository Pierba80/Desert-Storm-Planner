import { useState, useRef } from "react";
import "@/App.css";
import Planner from "@/pages/Planner";

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <>
      <Planner />

      {/* File audio di sottofondo in loop */}
      <audio ref={audioRef} src="/audio.mp3" loop preload="auto" />

      {/* Pulsante Audio in alto a destra */}
      <button
        type="button"
        onClick={toggleAudio}
        style={{
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: 99999,
          padding: "6px 12px",
          borderRadius: "8px",
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          color: isPlaying ? "#34d399" : "#9ca3af",
          border: "1px solid #374151",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {isPlaying ? "🔊 Audio ON" : "🔇 Audio OFF"}
      </button>

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
        © {new Date().getFullYear()} Pierba - Tutti i diritti riservati
      </div>
    </>
  );
}

export default App;

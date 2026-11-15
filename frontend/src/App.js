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
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <>
      <Planner />

      {/* File audio di sottofondo in loop */}
      <audio ref={audioRef} src="/audio.mp3" loop />

      {/* Pulsante Audio in alto a destra */}
      <button
        onClick={toggleAudio}
        title={isPlaying ? "Disattiva audio" : "Attiva audio"}
        style={{
          position: "fixed",
          top: "14px",
          right: "14px",
          zIndex: 99999,
          backgroundColor: isPlaying ? "#eab308" : "rgba(24, 24, 27, 0.9)",
          color: isPlaying ? "#000000" : "#ffffff",
          border: "1px solid rgba(234, 179, 8, 0.5)",
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: "bold",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
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

          

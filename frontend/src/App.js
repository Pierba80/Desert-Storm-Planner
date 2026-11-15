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
    import "@/App.css";
import Planner from "@/pages/Planner";

function App() {
  return (
    <>
      <Planner />
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

          

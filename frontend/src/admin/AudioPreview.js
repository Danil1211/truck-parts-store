import React, { useRef, useEffect, useState } from "react";

export default function AudioPreview({ blob, onRemove }) {
  const audioRef = useRef();
  const [playing, setPlaying] = useState(false);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [blob]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (!playing) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", background: "#eaf8ff", borderRadius: 16, padding: "10px 18px", flex: 1
    }}>
      <button
        type="button"
        onClick={handlePlayPause}
        style={{
          background: "#17aaff",
          border: "none",
          borderRadius: 10,
          color: "#fff",
          width: 40,
          height: 40,
          fontSize: 22,
          marginRight: 10
        }}
      >
        {playing ? "⏸" : "▶️"}
      </button>
      <span style={{ marginRight: 10 }}>Предпрослушка</span>
      <button type="button" onClick={onRemove}
        style={{ border: "none", background: "none", color: "#aaa", fontSize: 20, cursor: "pointer" }}
      >×</button>
      <audio
        ref={audioRef}
        src={url || undefined}
        preload="auto"
        style={{ display: "none" }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

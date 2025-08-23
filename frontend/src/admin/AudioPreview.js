import React, { useRef, useEffect, useState } from "react";

export default function AudioPreview({ blob, onRemove }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    // сброс проигрывания при смене blob
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    }

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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "#eaf8ff",
        borderRadius: 16,
        padding: "10px 18px",
        flex: 1,
      }}
    >
      <button
        type="button"
        onClick={handlePlayPause}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
        style={{
          background: "#17aaff",
          border: "none",
          borderRadius: 10,
          color: "#fff",
          width: 40,
          height: 40,
          fontSize: 20,
          marginRight: 10,
          cursor: "pointer",
        }}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <span style={{ flex: 1, fontSize: 14, color: "#333" }}>Предпрослушка</span>
      <button
        type="button"
        onClick={onRemove}
        style={{
          border: "none",
          background: "none",
          color: "#aaa",
          fontSize: 22,
          cursor: "pointer",
        }}
        aria-label="Удалить запись"
      >
        ×
      </button>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="auto"
          style={{ display: "none" }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
    </div>
  );
}

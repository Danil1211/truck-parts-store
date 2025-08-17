import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
const apiUrl = import.meta.env.VITE_API_URL || '';

export default function GroupCard({ group }) {
  const navigate = useNavigate();
  let img = '/images/no-image.png';
  if (group.img && typeof group.img === 'string' && group.img.trim()) {
    if (group.img.startsWith('http') || group.img.startsWith('//')) {
      img = group.img;
    } else if (group.img.startsWith('/')) {
      img = (apiUrl ? apiUrl.replace(/\/$/, '') : '') + group.img;
    } else {
      img = (apiUrl ? apiUrl.replace(/\/$/, '') : '') + '/' + group.img;
    }
  }
  const [hover, setHover] = useState(false);

  return (
    <div
      className="group-card"
      tabIndex={0}
      onClick={() => navigate(`/catalog/group/${group._id}`)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && navigate(`/catalog/group/${group._id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 2px 10px #003e3812",
        cursor: "pointer",
        transition: "box-shadow .18s, transform .15s",
        position: "relative",
        width: "100%",
        height: "100%",
        outline: "none",
        padding: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
      }}
    >
      <img
        src={img}
        alt={group.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 16,
          background: "#f6fafd",
          transition: "transform .17s",
          ...(hover ? { filter: "blur(2px) brightness(0.72) scale(1.04)" } : {}),
        }}
        onError={e => {
          if (!e.target.dataset.fallback) {
            e.target.src = "/images/no-image.png";
            e.target.dataset.fallback = "1";
          }
        }}
      />
      <div
        className="group-card-overlay"
        style={{
          pointerEvents: "none",
          opacity: hover ? 1 : 0,
          position: "absolute",
          inset: 0,
          background: "rgba(26,40,64,0.73)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          transition: "opacity .18s",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: 0,
            textAlign: "center",
            padding: "0 10px",
            lineHeight: 1.13,
            wordBreak: "break-word",
            textShadow: "0 2px 8px #001a2a56",
          }}
        >
          {group.name}
        </span>
      </div>
    </div>
  );
}

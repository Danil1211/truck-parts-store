import React from 'react';
import { useSite } from "../context/SiteContext";
import '../assets/ChatIcon.css';

export default function ChatIcon({ onClick }) {
  const { chatSettings } = useSite();
  const chatColor = chatSettings?.color || "#2291ff";
  const gradient = `linear-gradient(135deg, ${chatColor}, ${lightenColor(chatColor, 30)})`;
  const shadow = hexToRgba(chatColor, 0.5);
  const shadow2 = hexToRgba(chatColor, 0);

  return (
    <div
      className="chat-icon-container"
      onClick={onClick}
      style={{
        "--chat-main-color": chatColor,
        "--chat-main-gradient": gradient,
        "--chat-main-shadow": shadow,
        "--chat-main-shadow2": shadow2,
      }}
    >
      <div className="chat-launch-icon">💬</div>
    </div>
  );
}

function lightenColor(hex, percent) {
  let r = parseInt(hex.substr(1,2),16), g = parseInt(hex.substr(3,2),16), b = parseInt(hex.substr(5,2),16);
  r = Math.round(r + (255 - r) * percent/100);
  g = Math.round(g + (255 - g) * percent/100);
  b = Math.round(b + (255 - b) * percent/100);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
function hexToRgba(hex, alpha) {
  let r = parseInt(hex.substr(1,2),16), g = parseInt(hex.substr(3,2),16), b = parseInt(hex.substr(5,2),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

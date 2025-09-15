// src/admin/AdminChatDetail.jsx
import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api.js";
import "../assets/admin-chat-detail.css"; // 👈 новый файл со стилями

// Аккуратное построение абсолютных ссылок на медиа.
const BASE_URL = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
const withBase = (u) => (u && /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u || ""}`);

// Голосовое сообщение
function VoiceMessage({ url, createdAt }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
  };

  return (
    <div className="voice-message-bubble">
      <button className="voice-play-btn" onClick={toggle}>
        {playing ? "⏸" : "▶️"}
      </button>
      <div className="voice-wave" />
      <span className="voice-time">
        {createdAt
          ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : ""}
      </span>
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        preload="auto"
        style={{ display: "none" }}
      />
    </div>
  );
}

export default function AdminChatDetail({ userId, userName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  const load = async () => {
    if (!userId) return;
    setError("");
    try {
      const data = await api(`/api/chat/admin/${userId}?_=${Date.now()}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setMessages([]);
      setError("Не удалось загрузить сообщения");
      console.error("AdminChatDetail load error:", e);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 2500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!userId) return;
    if (!input.trim() && files.length === 0) return;

    const form = new FormData();
    if (input.trim()) form.append("text", input.trim());
    files.slice(0, 3).forEach((f) => form.append("images", f));

    setInput("");
    setFiles([]);

    try {
      await api(`/api/chat/admin/${userId}`, { method: "POST", body: form });
      await load();
    } catch (e) {
      console.error("send error:", e);
      setError("Не удалось отправить сообщение");
      setTimeout(() => setError(""), 2000);
    }
  };

  const onFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    const merged = [...files, ...picked].slice(0, 3); // лимит 3 как на бэке
    setFiles(merged);
  };

  const removeFile = (idx) => setFiles((arr) => arr.filter((_, i) => i !== idx));

  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="admin-chat-detail">
      <div className="admin-chat-detail__header">
        <h3 className="detail-title">Диалог с {userName || "пользователем"}</h3>
        <span className="detail-subtitle">в стиле Telegram</span>
      </div>

      <div className="admin-chat-messages">
        {safeMessages.map((msg, i) => (
          <div
            key={msg._id || i}
            className={`chat-message ${msg.fromAdmin ? "admin" : "user"}`}
          >
            {msg.text && <div className="chat-text">{msg.text}</div>}

            {/* изображения */}
            {Array.isArray(msg.imageUrls) &&
              msg.imageUrls.map((url, idx) => (
                <div className="chat-image-wrapper" key={idx}>
                  <img src={withBase(url)} alt="img" className="chat-image" />
                </div>
              ))}

            {/* голосовые */}
            {msg.audioUrl && (
              <VoiceMessage url={withBase(msg.audioUrl)} createdAt={msg.createdAt} />
            )}

            <div className="chat-time">
              {msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {files.length > 0 && (
        <div className="chat-preview">
          {files.map((f, i) => (
            <div className="chat-preview-item" key={i}>
              <img
                src={URL.createObjectURL(f)}
                alt="preview"
                className="chat-preview-img"
                onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
              />
              <button className="image-preview-remove" onClick={() => removeFile(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="detail-error">{error}</div>}

      <div className="chat-input">
        <input
          type="text"
          className="chat-input__field"
          placeholder="Ответить…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <input
          id="chatFile"
          type="file"
          accept="image/*"
          multiple
          onChange={onFileChange}
          style={{ display: "none" }}
        />
        <label htmlFor="chatFile" className="chat-attach-btn" title="Прикрепить фото">
          📎
        </label>

        <button className="chat-send-btn" onClick={handleSend} title="Отправить">
          ➤
        </button>
      </div>
    </div>
  );
}

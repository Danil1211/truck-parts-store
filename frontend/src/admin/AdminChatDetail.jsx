// src/admin/AdminChatDetail.jsx
import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api.js";
import "../assets/AdminPanel.css";

// Аккуратное построение абсолютных ссылок на медиа.
// Берём базу из api.defaults.baseURL (если настроен), срезаем хвостовые слэши.
// Если сервер уже вернул абсолютный URL — оставляем как есть.
const BASE_URL = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
const withBase = (u) => (u && /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u || ""}`);

// Простой аудио-блок
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
      <button className="voice-play-btn" onClick={toggle}>{playing ? "⏸" : "▶️"}</button>
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
        style={{ display: "none" }}
        preload="auto"
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

  // загрузка сообщений с анти-кэшем
  const load = async () => {
    if (!userId) return;
    setError("");
    try {
      const data = await api(`/api/chat/admin/${userId}?_=${Date.now()}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setMessages([]);
      setError("Не удалось загрузить сообщения");
      // тихо логируем
      console.error("AdminChatDetail load error:", e);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 2500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // автопрокрутка вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!userId) return;
    if (!input.trim() && files.length === 0) return;

    const form = new FormData();
    if (input.trim()) form.append("text", input.trim());

    // Бэкенд ждёт поле "images"
    files.slice(0, 3).forEach((f) => form.append("images", f));

    // очищаем инпуты и шлём
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

  const removeFile = (idx) => {
    setFiles((arr) => arr.filter((_, i) => i !== idx));
  };

  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="admin-chat-detail">
      <div className="admin-chat-detail__header">
        <h3 style={{ margin: 0 }}>
          Диалог с {userName || "пользователем"}
        </h3>
      </div>

      <div className="admin-chat-messages">
        {safeMessages.map((msg, i) => (
          <div
            key={msg._id || i}
            className={`chat-message ${msg.fromAdmin ? "admin" : "user"}`}
          >
            {msg.text && <span>{msg.text}</span>}

            {/* изображения */}
            {Array.isArray(msg.imageUrls) &&
              msg.imageUrls.map((url, idx) => (
                <div className="chat-image-wrapper" key={idx}>
                  <img
                    src={withBase(url)}
                    alt="img"
                    className="chat-image"
                  />
                </div>
              ))}

            {/* голосовые */}
            {msg.audioUrl && (
              <VoiceMessage
                url={withBase(msg.audioUrl)}
                createdAt={msg.createdAt}
              />
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

      {error && (
        <div style={{ color: "#d43838", marginTop: 6, fontSize: 14 }}>{error}</div>
      )}

      <div className="chat-input">
        <input
          type="text"
          placeholder="Ответить..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <input
          id="chatFile"
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={onFileChange}
        />
        <label htmlFor="chatFile" className="chat-attach-btn" title="Прикрепить фото">
          📎
        </label>

        <button onClick={handleSend}>Отправить</button>
      </div>
    </div>
  );
}

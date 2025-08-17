// src/admin/AdminChatDetail.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSite } from "../context/SiteContext"; // настройки SaaS (цвета, бренд и т.п.)
import "../assets/AdminPanel.css";

const apiUrl = import.meta.env.VITE_API_URL || "";

function AdminChatDetail({ userId, userName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("token");
  const { settings } = useSite(); // тянем бренд-настройки
  const tenantId = localStorage.getItem("tenantId"); // у каждого арендатора свой

  // === загрузка сообщений ===
  useEffect(() => {
    if (!userId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/chat/admin/${userId}?tenant=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Ошибка загрузки чата:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [userId, token, tenantId]);

  // === автоскролл вниз ===
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // === отправка сообщения ===
  const handleSend = async () => {
    if (!input.trim() && files.length === 0) return;

    const formData = new FormData();
    formData.append("text", input);
    files.forEach((f) => formData.append("files", f));

    const msg = {
      text: input,
      fromAdmin: true,
      createdAt: new Date().toISOString(),
      imageUrls: files.map((f) => URL.createObjectURL(f)),
    };

    setMessages((prev) => [...prev, msg]);
    setInput("");
    setFiles([]);

    try {
      await fetch(`${apiUrl}/api/chat/admin/${userId}?tenant=${tenantId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } catch (err) {
      console.error("Ошибка отправки:", err);
    }
  };

  return (
    <div className="admin-chat-detail">
      <h3 style={{ color: settings?.contacts?.color || "#2291ff" }}>
        Диалог с {userName || "пользователем"}
      </h3>

      <div className="admin-chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-message ${msg.fromAdmin ? "admin" : "user"}`}
          >
            {msg.text && <span>{msg.text}</span>}
            {msg.imageUrls?.map((url, idx) => (
              <div className="chat-image-wrapper" key={idx}>
                <img
                  src={url.startsWith("blob:") ? url : `${apiUrl}${url}`}
                  alt="img"
                  className="chat-image"
                />
              </div>
            ))}
            <div className="chat-time">
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* предпросмотр файлов */}
      {files.length > 0 && (
        <div className="chat-preview">
          {files.map((f, i) => (
            <img
              key={i}
              src={URL.createObjectURL(f)}
              alt="preview"
              className="chat-preview-img"
            />
          ))}
        </div>
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
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles([...files, ...e.target.files])}
          style={{ display: "none" }}
          id="chatFile"
        />
        <label htmlFor="chatFile" className="chat-attach-btn">📎</label>
        <button onClick={handleSend}>Отправить</button>
      </div>
    </div>
  );
}

export default AdminChatDetail;

// src/admin/AdminChatPage.jsx
import React, { useState, useEffect, useRef } from "react";
import Picker from "emoji-picker-react";
import "../assets/AdminPanel.css";
import { useAdminNotify } from "../context/AdminNotifyContext";
import api from "../utils/api";
const API_URL = import.meta.env.VITE_API_URL || "";

function decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function TypingAnimation() {
  const [dots, setDots] = useState("...");
  useEffect(() => {
    const arr = ["...", "..", ".", ""];
    let i = 0;
    const timer = setInterval(() => {
      setDots(arr[i % arr.length]);
      i++;
    }, 320);
    return () => clearInterval(timer);
  }, []);
  return <span style={{ marginLeft: 3 }}>{dots}</span>;
}

function VoiceMessage({ audioUrl, createdAt }) {
  const audioRef = useRef();
  const [playing, setPlaying] = useState(false);
  const handlePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  };
  return (
    <div className="voice-message-bubble">
      <button className="voice-play-btn" onClick={handlePlay}>
        {playing ? "⏸" : "▶️"}
      </button>
      <div className="voice-dots">
        <div className="voice-dot" />
        <div className="voice-dot" />
        <div className="voice-dot" />
      </div>
      <span className="voice-time">
        {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />
    </div>
  );
}

function AudioPreview({ audioPreview, onRemove }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef();
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!audioPreview) return;
    const objectUrl = URL.createObjectURL(audioPreview);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [audioPreview]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (!playing) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const audio = audioRef.current;
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    return () => {
      if (audio) {
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("ended", onPause);
      }
    };
  }, [url]);

  if (!audioPreview) return null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        background: "#eaf8ff",
        borderRadius: 16,
        padding: "10px 18px",
        marginRight: 12,
        boxShadow: "0 1px 6px #0d99ff11",
        minWidth: 200,
      }}
    >
      <button
        onClick={handlePlayPause}
        style={{
          background: "#17aaff",
          border: "none",
          borderRadius: 10,
          color: "#fff",
          width: 40,
          height: 40,
          fontSize: 22,
          marginRight: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        type="button"
      >
        {playing ? "⏸" : "▶️"}
      </button>
      <span style={{ fontSize: 15, color: "#3c4f67", fontWeight: 500, marginRight: 7 }}>
        Предпрослушка
      </span>
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          color: "#aaa",
          fontSize: 20,
          marginLeft: 2,
          cursor: "pointer",
        }}
        type="button"
      >
        ×
      </button>
      {url && <audio ref={audioRef} src={url} preload="auto" style={{ display: "none" }} />}
    </div>
  );
}

function isUserOnline(userInfo) {
  if (!userInfo?.lastOnlineAt) return false;
  return Date.now() - new Date(userInfo.lastOnlineAt).getTime() < 2 * 60 * 1000;
}

export default function AdminChatPage() {
  const { resetUnread, unread } = useAdminNotify();

  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [files, setFiles] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPreview, setAudioPreview] = useState(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [typingMap, setTypingMap] = useState({});
  const [blocking, setBlocking] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);
  const [error, setError] = useState("");

  const endRef = useRef(null);
  const messagesRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordingTimer = useRef();

  /** загрузка списка чатов */
  const loadChats = async () => {
    setError("");
    try {
      const data = await api("/api/chat/admin");
      setChats(
        data.map((c) => ({
          ...c,
          lastMessage:
            c.lastMessage?.text ||
            (c.lastMessage?.imageUrls?.length ? "📷 Фото" : "—"),
          lastMessageObj: c.lastMessage,
        }))
      );
    } catch (e) {
      setError("Ошибка получения чатов: " + e.message);
    }
  };

  /** автообновление чатов */
  useEffect(() => {
    loadChats();
    const iv = setInterval(loadChats, 4000);
    return () => clearInterval(iv);
  }, []);

  /** загрузка сообщений */
  const loadMessages = async () => {
    if (!selected) return;
    try {
      const data = await api(`/api/chat/admin/${selected.userId}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  };

  /** загрузка юзера + сообщений */
  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      await loadMessages();
      try {
        const info = await api(`/api/chat/admin/user/${selected.userId}`);
        setSelectedUserInfo(info);
      } catch {}
    };
    load();
    const iv = setInterval(load, 2500);
    resetUnread(selected.userId);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleSelectChat = async (c) => {
    setSelected(c);
    setFiles([]);
    setInput("");
    setIsAutoScroll(true);
    setAudioPreview(null);
    resetUnread(c.userId);

    const info = await api(`/api/chat/admin/user/${c.userId}`);
    setSelectedUserInfo(info);

    await api(`/api/chat/read/${c.userId}`, { method: "POST" });
    setTimeout(loadChats, 180);
  };

  const handleDeleteChat = async () => {
    if (!selected) return;
    if (!window.confirm("Удалить чат безвозвратно?")) return;

    const uid = selected.userId;
    await api(`/api/chat/admin/${uid}`, { method: "DELETE" });

    resetUnread(uid);
    setSelected(null);
    setMessages([]);
    setSelectedUserInfo(null);
    loadChats();
  };

  /** подготовка MediaRecorder для голосовых */
  useEffect(() => {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        try {
          mediaRecorder.current = new window.MediaRecorder(stream);
          mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
          mediaRecorder.current.onstop = () => {
            const blob = new Blob(audioChunks.current, { type: "audio/webm" });
            audioChunks.current = [];
            setAudioPreview(blob);
          };
        } catch {}
      })
      .catch(() => {});
  }, []);

  const typingOn = async () => {
    if (!selected) return;
    await api(`/api/chat/typing`, {
      method: "POST",
      body: { userId: selected.userId, isTyping: true, name: "Менеджер", fromAdmin: true },
    });
  };

  const typingOff = async () => {
    if (!selected) return;
    await api(`/api/chat/typing`, {
      method: "POST",
      body: { userId: selected.userId, isTyping: false, name: "Менеджер", fromAdmin: true },
    });
  };

  const startOrStopRecording = () => {
    if (!mediaRecorder.current || !selected) return;
    if (recording) {
      mediaRecorder.current.stop();
      setRecording(false);
      clearInterval(recordingTimer.current);
      typingOff();
    } else {
      audioChunks.current = [];
      mediaRecorder.current.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimer.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      typingOn();
    }
  };

  const handleAudioRemove = () => setAudioPreview(null);

  const handleAudioSend = async () => {
    if (!audioPreview || !selected) return;
    const form = new FormData();
    form.append("audio", audioPreview, "voice.webm");
    files.forEach((f) => form.append("images", f));
    setFiles([]);
    setAudioPreview(null);

    await api(`/api/chat/admin/${selected.userId}`, { method: "POST", body: form });
    await typingOff();
    await loadMessages();
    await loadChats();
  };

  const sendText = async () => {
    if (!input.trim() || !selected) return;
    await api(`/api/chat/admin/${selected.userId}`, {
      method: "POST",
      body: { text: input.trim() },
    });
    setInput("");
    await typingOff();
    await loadMessages();
    await loadChats();
  };

  const sendMedia = async ({ audio, images }) => {
    if (!selected) return;
    const form = new FormData();
    if (input.trim()) form.append("text", input.trim());
    if (audio) form.append("audio", audio, "voice.webm");
    images.forEach((f) => form.append("images", f));
    setFiles([]);
    setInput("");

    await api(`/api/chat/admin/${selected.userId}`, { method: "POST", body: form });
    await typingOff();
    await loadMessages();
    await loadChats();
  };

  const handleSend = () => {
    if (audioPreview) handleAudioSend();
    else if (files.length) sendMedia({ audio: null, images: files });
    else sendText();
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    if (!selected) return;
    api(`/api/chat/typing`, {
      method: "POST",
      body: { userId: selected.userId, isTyping: !!e.target.value, name: "Менеджер", fromAdmin: true },
    });
  };

  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));

  const hasUnread = (chat) => {
    if (!chat.lastMessageObj) return false;
    if (selected?.userId === chat.userId) return false;
    if (unread[chat.userId]) return true;
    return !chat.lastMessageObj.fromAdmin && !chat.lastMessageObj.read;
  };

  useEffect(() => {
    if (isAutoScroll) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAutoScroll]);

  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    setIsAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
  };

  if (error) {
    return <div style={{ color: "red", padding: 30, fontSize: 18 }}>{error}</div>;
  }

  return (
    <div className="admin-chat-root" style={{ display: "flex", height: "100vh" }}>
      {/* левая панель чатов */}
      <aside className="admin-chat-list">
        <h2 style={{ fontSize: 20, marginBottom: 20 }}>💬 Чаты</h2>
        {chats.map((c) => {
          const isSelected = selected?.userId === c.userId;
          const unreadExists = hasUnread(c);
          return (
            <div
              key={c.userId}
              onClick={() => handleSelectChat(c)}
              style={{
                display: "flex",
                gap: 12,
                padding: 12,
                borderRadius: 10,
                background: isSelected ? "#0d99ff" : unreadExists ? "#ffeaea" : "#f9fafb",
                color: isSelected ? "#fff" : "#000",
                cursor: "pointer",
                alignItems: "center",
                marginBottom: 8,
                transition: "0.2s",
                position: "relative",
                boxShadow: unreadExists ? "0 0 8px 2px rgba(244, 67, 54, 0.3)" : "none",
              }}
            >
              <div
                style={{
                  background: "#0d99ff",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: 16,
                  position: "relative",
                }}
              >
                {c.name?.[0] || "?"}
                {unreadExists && (
                  <span
                    style={{
                      display: "block",
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 16,
                      height: 16,
                      background: "#f44336",
                      borderRadius: "50%",
                      border: "3px solid #fff",
                      boxShadow: "0 0 8px 3px #f4433688",
                      animation: "pulseRed 1.5s infinite",
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.name}
                  {unreadExists && (
                    <span
                      style={{
                        marginLeft: 6,
                        background: "#f44336",
                        color: "#fff",
                        borderRadius: 4,
                        padding: "2px 6px",
                        fontSize: 10,
                        fontWeight: "bold",
                        verticalAlign: "middle",
                        userSelect: "none",
                      }}
                    >
                      NEW
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{c.phone}</div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.6,
                    marginTop: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.lastMessage?.slice(0, 30)}
                </div>
              </div>
              <button
                className="chat-header-btn"
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  fontSize: 24,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 2,
                  padding: 0,
                  transition: "color 0.2s ease",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat();
                }}
                title="Удалить чат"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f44336")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
              >
                ×
              </button>
            </div>
          );
        })}
      </aside>

      {/* центр: сообщения */}
      <section
        className="admin-chat-messages-block"
        style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}
      >
        {!selected ? (
          <div className="empty">Выберите чат слева</div>
        ) : (
          <>
            <header
              className="chat-header"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <strong>{selected.name}</strong>{" "}
                <span style={{ fontSize: 13, opacity: 0.8 }}>{selected.phone}</span>
              </div>
            </header>

            <div
              className="admin-chat-messages"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 20,
                overflowY: "auto",
                flex: 1,
              }}
              ref={messagesRef}
              onScroll={handleScroll}
            >
              {Array.isArray(messages) &&
                messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.fromAdmin ? "flex-start" : "flex-end",
                      background: m.fromAdmin ? "#0d99ff" : "#e5f1ff",
                      color: m.fromAdmin ? "#fff" : "#1e293b",
                      borderRadius: 16,
                      padding: "10px 14px",
                      maxWidth: "70%",
                      marginBottom: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      wordBreak: "break-word",
                      position: "relative",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {m.fromAdmin ? "Менеджер" : selected.name}
                    </div>
                    {m.text && <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{m.text}</div>}
                    {m.imageUrls?.map((u, idx) => (
                      <img
                        key={idx}
                        src={u.startsWith("http") ? u : `${API_URL}${u}`}
                        alt="img"
                        style={{ maxWidth: "200px", borderRadius: "8px" }}
                      />
                    ))}
                    {m.audioUrl && (
                      <VoiceMessage audioUrl={`${API_URL}${m.audioUrl}`} createdAt={m.createdAt} />
                    )}
                    {!m.audioUrl && (
                      <div style={{ fontSize: 12, textAlign: "right", opacity: 0.6 }}>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                ))}

              {typingMap[selected.userId]?.isTyping && !typingMap[selected.userId]?.fromAdmin && (
                <div className="typing-indicator">
                  <div
                    style={{
                      color: "#1976d2",
                      background: "#eaf4ff",
                      borderRadius: 16,
                      padding: "9px 20px",
                      maxWidth: "70%",
                      fontWeight: 500,
                      fontSize: 16,
                      marginLeft: "auto",
                      boxShadow: "0 1px 8px #0d99ff18",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#1976d2", fontWeight: 600 }}>
                      {decodeHtml(typingMap[selected.userId].name)}
                    </span>
                    <span style={{ color: "#1976d2", marginLeft: 6 }}>печатает</span>
                    <TypingAnimation />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {files.length > 0 && (
              <div className="image-preview-list">
                {files.map((file, i) => (
                  <div className="image-preview-item" key={i}>
                    <img src={URL.createObjectURL(file)} alt="preview" />
                    <button className="image-preview-remove" onClick={() => removeFile(i)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 16px",
                borderTop: "1px solid #e2e8f0",
                background: "#fff",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowEmoji((v) => !v)}
                style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer" }}
                tabIndex={-1}
                disabled={!!audioPreview}
              >
                😊
              </button>

              {!audioPreview && (
                <input
                  type="text"
                  placeholder="Написать…"
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "20px",
                    border: "1px solid #e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              )}

              {audioPreview && <AudioPreview audioPreview={audioPreview} onRemove={handleAudioRemove} />}

              <label
                style={{
                  fontSize: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: audioPreview ? 0.5 : 1,
                  pointerEvents: audioPreview ? "none" : "auto",
                }}
                tabIndex={-1}
              >
                📷
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files))}
                  style={{ display: "none" }}
                  disabled={!!audioPreview}
                />
              </label>

              <button
                onClick={startOrStopRecording}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  width: 36,
                  height: 36,
                }}
                tabIndex={-1}
                disabled={!!audioPreview}
                title={recording ? "Остановить запись" : "Записать голосовое"}
              >
                {recording ? (
                  <span
                    style={{
                      fontSize: 24,
                      color: "#fa2222",
                      animation: "pulseMic 1s infinite",
                      transition: "color 0.2s",
                      display: "inline-block",
                      position: "relative",
                    }}
                  >
                    🎤
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -10,
                        background: "#fa2222",
                        color: "#fff",
                        borderRadius: 10,
                        minWidth: 18,
                        height: 18,
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 5px",
                        boxShadow: "0 1px 4px #fa222244",
                        border: "2px solid #fff",
                        zIndex: 1,
                      }}
                    >
                      {recordingTime}
                    </span>
                    <style>
                      {`
                        @keyframes pulseMic {
                          0%   { transform: scale(1);}
                          50%  { transform: scale(1.12);}
                          100% { transform: scale(1);}
                        }
                      `}
                    </style>
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 20,
                      color: "#3c4f67",
                      borderRadius: "50%",
                      width: 30,
                      height: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    🎤
                  </span>
                )}
              </button>

              <button
                onClick={handleSend}
                style={{
                  fontSize: 20,
                  background: "#17aaff",
                  borderRadius: "50%",
                  width: 38,
                  height: 38,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  marginLeft: 2,
                  boxShadow: "0 1px 4px #17aaff22",
                }}
                tabIndex={-1}
                disabled={!!recording}
                title={audioPreview ? "Отправить голосовое" : "Отправить"}
              >
                ➤
              </button>
            </div>

            {showEmoji && (
              <div style={{ position: "absolute", bottom: 70, left: 320, zIndex: 10 }}>
                <Picker
                  onEmojiClick={(emojiData) => {
                    setInput((v) => v + emojiData.emoji);
                    setShowEmoji(false);
                  }}
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* правая инфопанель */}
      {selected && selectedUserInfo && (
        <aside
          className="user-info-block"
          style={{
            minWidth: 290,
            maxWidth: 320,
            background: "#f8fafb",
            padding: "24px 20px 20px 20px",
            borderLeft: "1px solid #e3e5ee",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            borderRadius: "0 0 15px 0",
            height: "100%",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 20,
              gap: 13,
              width: "100%",
            }}
          >
            <div
              style={{
                background: "#0d99ff",
                color: "#fff",
                borderRadius: "50%",
                width: 54,
                height: 54,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 24,
                boxShadow: "0 2px 18px #0d99ff11",
              }}
            >
              {selectedUserInfo.name?.[0] || "?"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>
                {selectedUserInfo.name}
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{selectedUserInfo.phone}</div>
            </div>
          </div>

          <div style={{ marginBottom: 14, width: "100%" }}>
            <div style={{ fontSize: 14, marginBottom: 5 }}>
              <b>IP:</b> <span style={{ color: "#2d3748" }}>{selectedUserInfo.ip || "—"}</span>
            </div>
            <div style={{ fontSize: 14, marginBottom: 5 }}>
              <b>Город:</b> <span style={{ color: "#2d3748" }}>{selectedUserInfo.city || "—"}</span>
            </div>
            <div style={{ fontSize: 14, marginBottom: 5 }}>
              <b>Статус:</b>{" "}
              <span
                style={{
                  color: isUserOnline(selectedUserInfo) ? "#21c087" : "#d43838",
                  fontWeight: 600,
                }}
              >
                {isUserOnline(selectedUserInfo) ? "Онлайн" : "Оффлайн"}
              </span>
            </div>
            <div style={{ fontSize: 14, marginBottom: 5 }}>
              <b>Блок:</b>{" "}
              <span
                style={{
                  color: selectedUserInfo.isBlocked ? "#d43838" : "#3eac4c",
                  fontWeight: 600,
                }}
              >
                {selectedUserInfo.isBlocked ? "Заблокирован" : "Активный"}
              </span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <button
            disabled={blocking}
            onClick={async () => {
              if (!selected) return;
              setBlocking(true);

              await api(`/api/chat/admin/user/${selected.userId}/block`, {
                method: "POST",
                body: { block: !selectedUserInfo.isBlocked },
              });

              setBlocking(false);

              const info = await api(`/api/chat/admin/user/${selected.userId}`);
              setSelectedUserInfo(info);
              await loadChats();
            }}
            style={{
              width: "100%",
              padding: "10px 0",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 0.2,
              border: "none",
              borderRadius: 14,
              background: selectedUserInfo.isBlocked
                ? "linear-gradient(90deg,#21c087 0%,#1fa463 100%)"
                : "linear-gradient(90deg,#fd4447 0%,#e54d2e 100%)",
              color: "#fff",
              boxShadow: selectedUserInfo.isBlocked
                ? "0 3px 16px #21c08733"
                : "0 3px 16px #fd444733",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: blocking ? "not-allowed" : "pointer",
              outline: "none",
              marginTop: 18,
              transition: "background 0.18s,box-shadow 0.18s,transform 0.18s",
              position: "relative",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              {selectedUserInfo.isBlocked ? "Разблокировать" : "Заблокировать"}
            </span>
          </button>

        </aside>
      )}

      <style>{`
        @keyframes pulseRed {
          0% { box-shadow: 0 0 6px 2px #f44336cc; }
          50% { box-shadow: 0 0 12px 6px #f4433666; }
          100% { box-shadow: 0 0 6px 2px #f44336cc; }
        }
      `}</style>
    </div>
  );
}

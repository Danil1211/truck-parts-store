import React, { useState, useEffect, useRef } from "react";
import Picker from "emoji-picker-react";
import { useAdminNotify } from "../context/AdminNotifyContext";
import api from "../utils/api.js";
import "../assets/admin-chat.css"; // 👈 новый файл со стилями

// База для медиа-URL
const BASE_URL = String(api.defaults.baseURL || "").replace(/\/+$/, "");
const withBase = (u) => (u && /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u || ""}`);

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
    const t = setInterval(() => (setDots(arr[i++ % arr.length])), 320);
    return () => clearInterval(t);
  }, []);
  return <span className="typing-dots">{dots}</span>;
}

function VoiceMessage({ audioUrl, createdAt }) {
  const audioRef = useRef();
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
  };
  return (
    <div className="voice-bubble">
      <button className={`voice-btn ${playing ? "pause" : "play"}`} onClick={toggle}>
        {playing ? "⏸" : "▶️"}
      </button>
      <div className="voice-bar">
        <div className="voice-bar-bg" />
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
    const u = URL.createObjectURL(audioPreview);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [audioPreview]);

  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : (audioRef.current.currentTime = 0, audioRef.current.play());
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const a = audioRef.current;
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    a.addEventListener("play", on);
    a.addEventListener("pause", off);
    a.addEventListener("ended", off);
    return () => {
      a.removeEventListener("play", on);
      a.removeEventListener("pause", off);
      a.removeEventListener("ended", off);
    };
  }, [url]);

  if (!audioPreview) return null;

  return (
    <div className="audio-preview">
      <button className="audio-preview__btn" onClick={toggle}>{playing ? "⏸" : "▶️"}</button>
      <span className="audio-preview__label">Предпрослушка</span>
      <button className="audio-preview__close" onClick={onRemove}>×</button>
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

  // ===== data =====
  const loadChats = async () => {
    setError("");
    try {
      const data = await api(`/api/chat/admin?_=${Date.now()}`);
      const arr = Array.isArray(data) ? data : [];
      setChats(
        arr.map((c) => ({
          ...c,
          lastMessage: c.lastMessage?.text || (c.lastMessage?.imageUrls?.length ? "📷 Фото" : "—"),
          lastMessageObj: c.lastMessage,
        }))
      );
    } catch (e) {
      setChats([]);
      setError("Ошибка получения чатов: " + (e?.message || "unknown"));
    }
  };

  useEffect(() => {
    loadChats();
    const iv = setInterval(loadChats, 4000);
    return () => clearInterval(iv);
  }, []);

  const loadMessages = async () => {
    if (!selected) return;
    try {
      const data = await api(`/api/chat/admin/${selected.userId}?_=${Date.now()}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      await loadMessages();
      try {
        const info = await api(`/api/chat/admin/user/${selected.userId}?_=${Date.now()}`);
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

    const info = await api(`/api/chat/admin/user/${c.userId}?_=${Date.now()}`);
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

  // ===== voice =====
  useEffect(() => {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia({ audio: true })
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
    await api(`/api/chat/admin/${selected.userId}`, { method: "POST", body: { text: input.trim() } });
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

  if (error) return <div className="admin-chat-error">{error}</div>;
  const chatList = Array.isArray(chats) ? chats : [];

  return (
    <div className="admin-chat-page"> {/* отступ от левого меню лэйаута */}
      <div className="admin-chat-root">
        {/* left */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar__head">
            <h2>Чаты</h2>
            <span className="hint">в стиле Telegram</span>
          </div>

          {chatList.map((c) => {
            const isSelected = selected?.userId === c.userId;
            const unreadExists = hasUnread(c);
            return (
              <div
                key={c.userId}
                className={`chat-item ${isSelected ? "selected" : ""} ${unreadExists ? "unread" : ""}`}
                onClick={() => handleSelectChat(c)}
              >
                <div className="chat-avatar">
                  {c.name?.[0] || "?"}
                  {unreadExists && <span className="chat-unread-dot" />}
                </div>
                <div className="chat-meta">
                  <div className="chat-title">
                    <span className="chat-name">{c.name}</span>
                    {unreadExists && <span className="chat-new">NEW</span>}
                  </div>
                  <div className="chat-phone">{c.phone}</div>
                  <div className="chat-last">{c.lastMessage?.slice(0, 40)}</div>
                </div>
                <button
                  className="chat-delete"
                  title="Удалить чат"
                  onClick={(e) => { e.stopPropagation(); handleDeleteChat(); }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </aside>

        {/* center */}
        <section className="chat-main">
          {!selected ? (
            <div className="chat-empty">Выберите чат слева</div>
          ) : (
            <>
              <header className="chat-topbar">
                <div className="chat-topbar__title">
                  <strong>{selected.name}</strong>
                  <span className="muted">{selected.phone}</span>
                </div>
              </header>

              <div className="thread" ref={messagesRef} onScroll={handleScroll}>
                {Array.isArray(messages) && messages.map((m, i) => (
                  <div key={i} className={`bubble ${m.fromAdmin ? "in" : "out"}`}>
                    <div className="bubble-author">
                      {m.fromAdmin ? "Менеджер" : selected.name}
                    </div>
                    {m.text && <div className="bubble-text">{m.text}</div>}
                    {m.imageUrls?.map((u, idx) => (
                      <img key={idx} src={withBase(u)} alt="img" className="bubble-img" />
                    ))}
                    {m.audioUrl && (
                      <VoiceMessage audioUrl={withBase(m.audioUrl)} createdAt={m.createdAt} />
                    )}
                    {!m.audioUrl && (
                      <div className="bubble-time">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                ))}

                {typingMap[selected?.userId]?.isTyping && !typingMap[selected?.userId]?.fromAdmin && (
                  <div className="typing">
                    <span className="typing-name">{decodeHtml(typingMap[selected.userId].name)}</span>
                    <span> печатает</span><TypingAnimation />
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {files.length > 0 && (
                <div className="previews">
                  {files.map((file, i) => (
                    <div className="preview" key={i}>
                      <img src={URL.createObjectURL(file)} alt="preview" />
                      <button className="preview__close" onClick={() => removeFile(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="composer">
                <button
                  className="icon-btn"
                  onClick={() => setShowEmoji((v) => !v)}
                  disabled={!!audioPreview}
                  title="Эмодзи"
                >😊</button>

                {!audioPreview && (
                  <input
                    type="text"
                    className="composer__input"
                    placeholder="Написать…"
                    value={input}
                    onChange={handleInput}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                )}

                {audioPreview && <AudioPreview audioPreview={audioPreview} onRemove={handleAudioRemove} />}

                <label className={`icon-btn ${audioPreview ? "icon-btn--disabled" : ""}`} title="Прикрепить фото">
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
                  className={`icon-btn mic ${recording ? "mic--rec" : ""}`}
                  onClick={startOrStopRecording}
                  disabled={!!audioPreview}
                  title={recording ? `Остановить запись (${recordingTime}s)` : "Записать голосовое"}
                >
                  🎤
                  {recording && <span className="mic__badge">{recordingTime}</span>}
                </button>

                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={!!recording}
                  title={audioPreview ? "Отправить голосовое" : "Отправить"}
                >
                  ➤
                </button>
              </div>

              {showEmoji && (
                <div className="emoji-popover">
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

        {/* right */}
        {selected && selectedUserInfo && (
          <aside className="user-panel">
            <div className="user-card">
              <div className="user-avatar">{selectedUserInfo.name?.[0] || "?"}</div>
              <div className="user-id">
                <div className="user-name">{selectedUserInfo.name}</div>
                <div className="user-phone">{selectedUserInfo.phone}</div>
              </div>
            </div>

            <div className="user-props">
              <div><b>IP:</b> <span>{selectedUserInfo.ip || "—"}</span></div>
              <div><b>Город:</b> <span>{selectedUserInfo.city || "—"}</span></div>
              <div>
                <b>Статус:</b>{" "}
                <span className={`pill ${isUserOnline(selectedUserInfo) ? "pill--ok" : "pill--bad"}`}>
                  {isUserOnline(selectedUserInfo) ? "Онлайн" : "Оффлайн"}
                </span>
              </div>
              <div>
                <b>Блок:</b>{" "}
                <span className={`pill ${selectedUserInfo.isBlocked ? "pill--bad" : "pill--ok"}`}>
                  {selectedUserInfo.isBlocked ? "Заблокирован" : "Активный"}
                </span>
              </div>
            </div>

            <button
              className={`block-btn ${selectedUserInfo.isBlocked ? "block-btn--green" : "block-btn--red"}`}
              disabled={blocking}
              onClick={async () => {
                if (!selected) return;
                setBlocking(true);
                await api(`/api/chat/admin/user/${selected.userId}/block`, {
                  method: "POST",
                  body: { block: !selectedUserInfo.isBlocked },
                });
                setBlocking(false);
                const info = await api(`/api/chat/admin/user/${selected.userId}?_=${Date.now()}`);
                setSelectedUserInfo(info);
                await loadChats();
              }}
            >
              {selectedUserInfo.isBlocked ? "Разблокировать" : "Заблокировать"}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

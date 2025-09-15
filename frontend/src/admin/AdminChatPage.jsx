// src/admin/AdminChatPage.jsx
import React, { useState, useEffect, useRef } from "react";
import Picker from "emoji-picker-react";
import { useAdminNotify } from "../context/AdminNotifyContext";
import api from "../utils/api.js";
import "../assets/admin-chat.css";

// База для медиа-URL
const BASE_URL = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
const withBase = (u) => (u && /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u || ""}`);

/* ===== SVG иконки (лаконичные, «айтюнсовые») ===== */
const Icon = {
  emoji: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 15s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  ),
  camera: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  mic: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3" />
    </svg>
  ),
  send: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
};

/* ===== утилы ===== */
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
    const t = setInterval(() => setDots(arr[i++ % arr.length]), 320);
    return () => clearInterval(t);
  }, []);
  return <span className="typing-dots">{dots}</span>;
}
function isUserOnline(userInfo) {
  if (!userInfo?.lastOnlineAt) return false;
  return Date.now() - new Date(userInfo.lastOnlineAt).getTime() < 2 * 60 * 1000;
}

/* ===== голосовые ===== */
function VoiceMessage({ audioUrl, createdAt }) {
  const audioRef = useRef();
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
  };
  return (
    <div className="voice-bubble">
      <button className={`icon-btn voice-toggle ${playing ? "pause" : "play"}`} onClick={toggle} title={playing ? "Пауза" : "Воспроизвести"}>
        {Icon.mic}
      </button>
      <div className="voice-bar"><div className="voice-bar-bg" /></div>
      <span className="voice-time">
        {createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
      </span>
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
        preload="auto"
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
      <button className="icon-btn" onClick={toggle} title={playing ? "Пауза" : "Прослушать"}>{Icon.mic}</button>
      <span className="audio-preview__label">Предпрослушка</span>
      <button className="preview__close" onClick={onRemove} title="Удалить">×</button>
      {url && <audio ref={audioRef} src={url} preload="auto" style={{ display: "none" }} />}
    </div>
  );
}

/* ====================================================================================== */

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
  const [diag, setDiag] = useState({ lastChatsCount: 0, lastFetchOk: null });

  // новый: поиск слева
  const [search, setSearch] = useState("");

  // быстрые ответы
  const [qrOpen, setQrOpen] = useState(false);
  const quickReplies = ["Ожидайте, пожалуйста. ⚙️", "Уже спешу на помощь! 🚀"];

  const endRef = useRef(null);
  const messagesRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordingTimer = useRef();

  /* ================== CHATS LIST ================== */
  const normalizeChatsResponse = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.chats)) return res.chats;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (res && typeof res === "object" && Array.isArray(res.data?.chats)) return res.data.chats;
    if (res && typeof res === "object" && Array.isArray(res.data)) return res.data;
    return [];
  };

  const loadChats = async () => {
    setError("");
    try {
      const res = await api(`/api/chat/admin?_=${Date.now()}`);
      const arr = normalizeChatsResponse(res);
      setChats(
        arr.map((c) => ({
          ...c,
          lastMessage: c.lastMessage?.text || (c.lastMessage?.imageUrls?.length ? "📷 Фото" : "—"),
          lastMessageObj: c.lastMessage,
        }))
      );
      setDiag({ lastChatsCount: arr.length, lastFetchOk: true });
    } catch (e) {
      console.error("loadChats error:", e);
      setChats([]);
      setError("Ошибка получения чатов");
      setDiag({ lastChatsCount: 0, lastFetchOk: false });
    }
  };

  useEffect(() => {
    loadChats();
    const iv = setInterval(loadChats, 4000);
    return () => clearInterval(iv);
  }, []);

  /* ================== MESSAGES ================== */
  const loadMessages = async () => {
    if (!selected) return;
    try {
      const data = await api(`/api/chat/admin/${selected.userId}?_=${Date.now()}`);
      setMessages(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error("loadMessages error:", e);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      await loadMessages();
      try {
        const info = await api(`/api/chat/admin/user/${selected.userId}?_=${Date.now()}`);
        setSelectedUserInfo(info?.data || info);
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
    setQrOpen(false);
    resetUnread(c.userId);

    try {
      const info = await api(`/api/chat/admin/user/${c.userId}?_=${Date.now()}`);
      setSelectedUserInfo(info?.data || info);
    } catch {}

    try {
      await api(`/api/chat/read/${c.userId}`, { method: "POST" });
    } catch {}
    setTimeout(loadChats, 180);
  };

  const handleDeleteChat = async () => {
    if (!selected) return;
    if (!window.confirm("Удалить весь диалог с пользователем?")) return;
    const uid = selected.userId;
    try {
      await api(`/api/chat/admin/${uid}`, { method: "DELETE" });
    } catch (e) {
      console.error("DELETE chat error:", e);
    }
    resetUnread(uid);
    setSelected(null);
    setMessages([]);
    setSelectedUserInfo(null);
    await loadChats();
  };

  /* ================== VOICE ================== */
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
    try {
      await api(`/api/chat/admin/${selected.userId}`, { method: "POST", body: form });
      await typingOff();
      await loadMessages();
      await loadChats();
    } catch (e) {
      console.error("audio send error:", e);
    }
  };

  /* ================== SEND ================== */
  const sendText = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || !selected) return;
    try {
      await api(`/api/chat/admin/${selected.userId}`, { method: "POST", body: { text } });
      setInput("");
      await typingOff();
      await loadMessages();
      await loadChats();
    } catch (e) {
      console.error("sendText error:", e);
    }
  };

  const sendMedia = async ({ audio, images }) => {
    if (!selected) return;
    const form = new FormData();
    if (input.trim()) form.append("text", input.trim());
    if (audio) form.append("audio", audio, "voice.webm");
    images.forEach((f) => form.append("images", f));
    setFiles([]);
    setInput("");
    try {
      await api(`/api/chat/admin/${selected.userId}`, { method: "POST", body: form });
      await typingOff();
      await loadMessages();
      await loadChats();
    } catch (e) {
      console.error("sendMedia error:", e);
    }
  };

  const handleSend = () => {
    if (audioPreview) handleAudioSend();
    else if (files.length) sendMedia({ audio: null, images: files });
    else sendText();
  };

  const markUnread = async () => {
    if (!selected) return;
    try {
      await api(`/api/chat/unread/${selected.userId}`, { method: "POST" });
      await loadChats();
    } catch (e) {
      console.error("markUnread error:", e);
    }
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

  // авто-скролл
  useEffect(() => {
    if (isAutoScroll) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAutoScroll]);
  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    setIsAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
  };

  // typing poll
  useEffect(() => {
    let iv;
    const pollTyping = async () => {
      try {
        const res = await api(`/api/chat/typing/statuses?_=${Date.now()}`);
        if (res && typeof res === "object") setTypingMap(res);
      } catch {}
    };
    pollTyping();
    iv = setInterval(pollTyping, 1200);
    return () => clearInterval(iv);
  }, []);

  if (error) {
    return (
      <div className="admin-chat-error">
        {error}
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
          Диагностика: lastFetchOk={String(diag.lastFetchOk)}; chats={diag.lastChatsCount}
        </div>
      </div>
    );
  }

  // фильтрация по телефону
  const norm = (s) => String(s || "").replace(/[^\d+]/g, "");
  const phoneQuery = norm(search);
  const filteredChats = (Array.isArray(chats) ? chats : []).filter((c) =>
    phoneQuery ? norm(c.phone).includes(phoneQuery) : true
  );

  return (
    <div className="admin-chat-page">
      <div className="admin-chat-root">
        {/* ===== LEFT: список чатов + поиск ===== */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar__head">
            <h2>Чаты</h2>
            <input
              className="chat-search"
              type="text"
              placeholder="Поиск по телефону"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredChats.length === 0 ? (
            <div className="chat-empty-left">Ничего не найдено</div>
          ) : (
            filteredChats.map((c) => {
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
                    <div className="chat-last">{c.lastMessage?.slice(0, 64)}</div>
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
            })
          )}
        </aside>

        {/* ===== CENTER: поток сообщений ===== */}
        <section className="chat-main">
          {!selected ? (
            <div className="chat-empty">Выберите чат слева</div>
          ) : (
            <>
              <header className="chat-topbar">
                <div className="chat-topbar__title">
                  <strong>{selected.name}</strong>
                </div>
                <div className="chat-topbar__actions">
                  <button className="btn ghost" onClick={markUnread} title="Пометить как непрочитанный">
                    Непрочитано
                  </button>
                  <div className="quick-wrap">
                    <button className="btn ghost" onClick={() => setQrOpen((v) => !v)} title="Быстрый ответ">
                      Быстрый ответ
                    </button>
                    {qrOpen && (
                      <div className="quick-menu" onMouseLeave={() => setQrOpen(false)}>
                        {quickReplies.map((q, i) => (
                          <div
                            key={i}
                            className="quick-item"
                            onClick={() => { setQrOpen(false); sendText(q); }}
                          >
                            {q}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="thread" ref={messagesRef} onScroll={handleScroll}>
                {Array.isArray(messages) && messages.map((m, i) => (
                  <div key={m._id || i} className={`bubble ${m.fromAdmin ? "in" : "out"}`}>
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

                {selected?.userId &&
                  typingMap[selected.userId]?.isTyping &&
                  !typingMap[selected.userId]?.fromAdmin && (
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
                >
                  {Icon.emoji}
                </button>

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

                {audioPreview && (
                  <AudioPreview audioPreview={audioPreview} onRemove={() => setAudioPreview(null)} />
                )}

                <label className={`icon-btn ${audioPreview ? "icon-btn--disabled" : ""}`} title="Прикрепить фото">
                  {Icon.camera}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
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
                  {Icon.mic}
                </button>

                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={!!recording}
                  title={audioPreview ? "Отправить голосовое" : "Отправить"}
                >
                  {Icon.send}
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

        {/* ===== RIGHT: карточка пользователя ===== */}
        {selected && selectedUserInfo && (
          <aside className="user-panel">
            <div className="user-card">
              <div className="user-avatar">{selectedUserInfo.name?.[0] || "?"}</div>
              <div className="user-id">
                <div className="user-name">{selectedUserInfo.name}</div>
              </div>
            </div>

            <div className="user-props">
              <div><b>IP:</b> <span>{selectedUserInfo.ip || "—"}</span></div>
              <div><b>Город:</b> <span>{selectedUserInfo.city || "—"}</span></div>
              <div>
                <b>Страница:</b>{" "}
                {selectedUserInfo?.lastPageUrl || selectedUserInfo?.pageUrl || selectedUserInfo?.referrer ? (
                  <a
                    href={selectedUserInfo.lastPageUrl || selectedUserInfo.pageUrl || selectedUserInfo.referrer}
                    target="_blank" rel="noreferrer"
                  >
                    открыть ↗
                  </a>
                ) : <span>—</span>}
              </div>
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
                try {
                  await api(`/api/chat/admin/user/${selected.userId}/block`, {
                    method: "POST",
                    body: { block: !selectedUserInfo.isBlocked },
                  });
                  const info = await api(`/api/chat/admin/user/${selected.userId}?_=${Date.now()}`);
                  setSelectedUserInfo(info?.data || info);
                  await loadChats();
                } finally {
                  setBlocking(false);
                }
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

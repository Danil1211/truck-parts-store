import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import Picker from "emoji-picker-react";
import { useAdminNotify } from "../context/AdminNotifyContext";
import api from "../utils/api.js";
import "../assets/admin-chat.css";

const BASE_URL = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
const withBase = (u) => (u && /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u || ""}`);

/* ---------- НОРМАЛИЗАЦИЯ USER INFO (фикс "Страница: —") ---------- */
const normalizeUserInfo = (raw) => {
  const d = raw?.data ?? raw ?? {};
  const u = d.user ?? d.profile ?? d; // частые варианты обёрток

  const lastPageUrl =
    u.lastPageUrl || u.lastPage || u.lastUrl || u.pageUrl || u.path || u.url || null;

  return {
    name: u.name || d.name || "",
    phone: u.phone || u.tel || "",
    ip: u.ip || u.ipAddress || "",
    city: u.city || u.location?.city || "",
    isBlocked: Boolean(u.isBlocked ?? u.blocked),
    lastOnlineAt: u.lastOnlineAt || u.lastSeenAt || u.last_seen || null,
    lastPageUrl, // относительный или абсолютный — при рендере прогоняем через withBase
  };
};

const Svg = {
  smile: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" />
      <path d="M8 15c1.333 1.333 2.667 2 4 2s2.667-.667 4-2" fill="none" stroke="currentColor" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  camera: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="7" width="18" height="14" rx="3" fill="none" stroke="currentColor" />
      <path d="M7 7l2-3h6l2 3" fill="none" stroke="currentColor" />
      <circle cx="12" cy="14" r="3.5" fill="none" stroke="currentColor" />
    </svg>
  ),
  mic: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <rect x="9" y="3" width="6" height="12" rx="3" fill="none" stroke="currentColor" />
      <path d="M5 12a7 7 0 0014 0M12 19v2" fill="none" stroke="currentColor" />
    </svg>
  ),
  send: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M22 2L11 13" fill="none" stroke="currentColor" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="currentColor" />
    </svg>
  ),
};

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

function VoiceMessage({ audioUrl, createdAt }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
  };
  return (
    <div className="voice-bubble">
      <button className={`icon-btn voice ${playing ? "pause" : "play"}`} onClick={toggle}>
        {playing ? "⏸" : "▶️"}
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

function AudioPreview({ blob, onRemove }) {
  const [url, setUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

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

  if (!blob) return null;

  return (
    <div className="audio-preview">
      <button
        className="audio-preview__btn"
        onClick={() => {
          const a = audioRef.current;
          if (!a) return;
          playing ? a.pause() : (a.currentTime = 0, a.play());
        }}
      >
        {playing ? "⏸" : "▶️"}
      </button>
      <span className="audio-preview__label">Предпрослушка</span>
      <button className="audio-preview__close" onClick={onRemove}>×</button>
      {url && <audio ref={audioRef} src={url} preload="auto" style={{ display: "none" }} />}
    </div>
  );
}

function isUserOnline(info) {
  if (!info?.lastOnlineAt) return false;
  return Date.now() - new Date(info.lastOnlineAt).getTime() < 2 * 60 * 1000;
}

export default function AdminChatPage() {
  const { resetUnread, unread } = useAdminNotify();

  // точный topbar
  useLayoutEffect(() => {
    const el = document.querySelector(".admin-topbar");
    const h = el ? Math.round(el.getBoundingClientRect().height) : 56;
    document.documentElement.style.setProperty("--topbar-h", `${h}px`);
  }, []);

  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
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

  // ================== CHATS LIST ==================
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
    } catch (e) {
      console.error("loadChats error:", e);
      setChats([]);
      setError("Ошибка получения чатов");
    }
  };

  useEffect(() => {
    loadChats();
    const iv = setInterval(loadChats, 4000);
    return () => clearInterval(iv);
  }, []);

  // ================== MESSAGES ==================
  const loadMessages = async () => {
    if (!selected) return;
    try {
      const { data } = await api.get(`/api/chat/admin/${selected.userId}`, { params: { _: Date.now() } });
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
        const info = await api.get(`/api/chat/admin/user/${selected.userId}`, { params: { _: Date.now() } });
        setSelectedUserInfo(normalizeUserInfo(info));
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
    setShowQuick(false);
    setIsAutoScroll(true);
    setAudioPreview(null);
    resetUnread(c.userId);

    try {
      const info = await api.get(`/api/chat/admin/user/${c.userId}`, { params: { _: Date.now() } });
      setSelectedUserInfo(normalizeUserInfo(info));
    } catch {}

    try { await api.post(`/api/chat/read/${c.userId}`); } catch {}
    setTimeout(loadChats, 180);
  };

  const handleDeleteChat = async (chat) => {
    const uid = chat?.userId || selected?.userId;
    if (!uid) return;
    if (!window.confirm("Удалить чат безвозвратно?")) return;
    try { await api.delete(`/api/chat/admin/${uid}`); } catch {}
    if (selected?.userId === uid) {
      setSelected(null);
      setMessages([]);
      setSelectedUserInfo(null);
    }
    await loadChats();
  };

  // ================== VOICE ==================
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
    try { await api.post(`/api/chat/typing`, { userId: selected.userId, isTyping: true, name: "Менеджер", fromAdmin: true }); } catch {}
  };
  const typingOff = async () => {
    if (!selected) return;
    try { await api.post(`/api/chat/typing`, { userId: selected.userId, isTyping: false, name: "Менеджер", fromAdmin: true }); } catch {}
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

  const quickReplies = [
    "Ожидайте, пожалуйста. Проверяю информацию ✅",
    "Уже спешу на помощь! 🙌",
  ];
  const handleQuickReply = async (text) => {
    if (!selected) return;
    try {
      await api.post(`/api/chat/admin/${selected.userId}`, { text });
      await typingOff();
      await loadMessages();
      await loadChats();
      setShowQuick(false);
    } catch (e) {
      console.error("quick reply error:", e);
    }
  };

  const handleAudioSend = async () => {
    if (!audioPreview || !selected) return;
    const form = new FormData();
    form.append("audio", audioPreview, "voice.webm");
    files.forEach((f) => form.append("images", f));
    setFiles([]);
    setAudioPreview(null);
    try {
      await api.post(`/api/chat/admin/${selected.userId}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      await typingOff();
      await loadMessages();
      await loadChats();
    } catch (e) {
      console.error("audio send error:", e);
    }
  };

  // ================== SEND ==================
  const sendText = async () => {
    if (!input.trim() || !selected) return;
    try {
      await api.post(`/api/chat/admin/${selected.userId}`, { text: input.trim() });
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
      await api.post(`/api/chat/admin/${selected.userId}`, form, { headers: { "Content-Type": "multipart/form-data" } });
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

  const handleInput = (e) => {
    setInput(e.target.value);
    if (!selected) return;
    api.post(`/api/chat/typing`, {
      userId: selected.userId,
      isTyping: !!e.target.value,
      name: "Менеджер",
      fromAdmin: true,
    }).catch(()=>{});
  };

  const removeFile = (idx) => setFiles((arr) => arr.filter((_, i) => i !== idx));

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
    const poll = async () => {
      try {
        const res = await api.get(`/api/chat/typing/statuses`, { params: { _: Date.now() } });
        if (res && typeof res === "object") setTypingMap(res.data || res);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 1200);
    return () => clearInterval(iv);
  }, []);

  // Универсальная пометка "Непрочитано" — пробуем несколько эндпоинтов
  const markUnread = async (uid) => {
    try { await api.post(`/api/chat/admin/${uid}/unread`); return; } catch {}
    try { await api.post(`/api/chat/unread/${uid}`); return; } catch {}
    try { await api.post(`/api/chat/read/${uid}`, { unread: true }); } catch {}
  };

  if (error) return <div className="admin-chat-error">{error}</div>;
  const chatList = Array.isArray(chats) ? chats : [];

  return (
    <div className="admin-chat-page">
      <div className="admin-chat-root">
        {/* LEFT */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar__search">
            <input
              type="text"
              placeholder="Поиск по телефону"
              onChange={(e) => {
                const q = e.target.value.trim();
                if (!q) return loadChats();
                const f = chats.filter((c) => (c.phone || "").includes(q));
                setChats(f);
              }}
            />
          </div>

          <div className="chat-list">
            {chatList.length === 0 ? (
              <div className="chat-empty-left">Пока нет диалогов</div>
            ) : (
              chatList.map((c) => {
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
                      onClick={(e) => { e.stopPropagation(); handleDeleteChat(c); }}
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CENTER */}
        <section className="chat-main">
          {!selected ? (
            <div className="chat-empty">Выберите чат слева</div>
          ) : (
            <>
              <header className="chat-topbar">
                <div className="chat-topbar__title">
                  <strong>{selected.name}</strong>
                </div>

                <div className="chat-actions">
                  <button
                    className="btn-outline"
                    onClick={async () => {
                      if (!selected) return;
                      await markUnread(selected.userId);
                      await loadChats();
                    }}
                  >
                    Непрочитано
                  </button>

                  <div className={`quick ${showQuick ? "open" : ""}`}>
                    <button className="btn-outline" onClick={() => setShowQuick((v) => !v)}>
                      Быстрый ответ
                    </button>
                    {showQuick && (
                      <div className="quick-menu" onMouseLeave={() => setShowQuick(false)}>
                        {["Ожидайте, пожалуйста. Проверяю информацию ✅","Уже спешу на помощь! 🙌"].map((q, i) => (
                          <button key={i} onClick={() => handleQuickReply(q)}>{q}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="thread" ref={messagesRef} onScroll={handleScroll}>
                {Array.isArray(messages) && messages.map((m, i) => (
                  <div key={m._id || i} className={`bubble ${m.fromAdmin ? "in" : "out"}`}>
                    <div className="bubble-author">{m.fromAdmin ? "Менеджер" : selected.name}</div>
                    {m.text && <div className="bubble-text">{m.text}</div>}
                    {m.imageUrls?.map((u, idx) => (
                      <img key={idx} src={withBase(u)} alt="img" className="bubble-img" />
                    ))}
                    {m.audioUrl && <VoiceMessage audioUrl={withBase(m.audioUrl)} createdAt={m.createdAt} />}

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
                      <img src={URL.createObjectURL(file)} alt="preview" onLoad={(e)=>URL.revokeObjectURL(e.currentTarget.src)} />
                      <button className="preview__close" onClick={() => removeFile(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="composer">
                <button className="icon-btn" onClick={() => setShowEmoji((v) => !v)} title="Эмодзи">
                  {Svg.smile}
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

                {audioPreview && <AudioPreview blob={audioPreview} onRemove={() => setAudioPreview(null)} />}

                <label className={`icon-btn ${audioPreview ? "icon-btn--disabled" : ""}`} title="Прикрепить фото">
                  {Svg.camera}
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
                  {Svg.mic}
                  {recording && <span className="mic__badge">{recordingTime}</span>}
                </button>

                <button className="send-btn" onClick={handleSend} disabled={!!recording} title="Отправить">
                  {Svg.send}
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

        {/* RIGHT */}
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
                <b>Страница:</b>{" "}
                {selectedUserInfo?.lastPageUrl
                  ? (<a href={withBase(selectedUserInfo.lastPageUrl)} target="_blank" rel="noreferrer">Открыть</a>)
                  : "—"}
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

            <div className="block-row">
              <button
                className={`block-btn ${selectedUserInfo.isBlocked ? "unblock" : "block"}`}
                disabled={blocking}
                onClick={async () => {
                  if (!selected) return;
                  setBlocking(true);
                  try {
                    await api.post(`/api/chat/admin/user/${selected.userId}/block`, {
                      block: !selectedUserInfo.isBlocked,
                    });
                    const info = await api.get(`/api/chat/admin/user/${selected.userId}`, { params: { _: Date.now() } });
                    setSelectedUserInfo(normalizeUserInfo(info));
                    await loadChats();
                  } finally {
                    setBlocking(false);
                  }
                }}
              >
                {selectedUserInfo.isBlocked ? "Разблокировать" : "Заблокировать"}
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

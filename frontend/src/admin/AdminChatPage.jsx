import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Picker from "emoji-picker-react";
import { useAdminNotify } from "../context/AdminNotifyContext";
import api from "../utils/api";
import "../assets/admin-chat.css";

/* --- базовые урлы --- */
const API_BASE = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
const SITE_ORIGIN =
  typeof window !== "undefined" ? String(window.location.origin).replace(/\/+$/, "") : "";

/* medиа из API/локальные blob */
const isExternalUrl = (u) => /^https?:\/\//i.test(String(u || ""));
const isBlobUrl = (u) => /^blob:/i.test(String(u || ""));
const withApi = (u) => (isExternalUrl(u) || isBlobUrl(u) ? u : `${API_BASE}${u || ""}`);

/* ссылки на страницы сайта (relative -> текущий origin) */
const withSite = (u) => (isExternalUrl(u) ? u : `${SITE_ORIGIN}${u || ""}`);

/* ---------- нормализация user info ---------- */
const normalizeUserInfo = (raw) => {
  const d = raw?.data ?? raw ?? {};
  const u = d.user ?? d.profile ?? d;

  const lastPageUrl =
    u.lastPageUrl || u.lastPage || u.lastUrl || u.pageUrl || u.currentUrl ||
    u.path || u.href || u.url || u.referrer || u.referer || u.last_page || null;

  return {
    name: u.name || d.name || "",
    phone: u.phone || u.tel || "",
    ip: u.ip || u.ipAddress || "",
    city: u.city || u.location?.city || "",
    isBlocked: Boolean(u.isBlocked ?? u.blocked),
    lastOnlineAt: u.lastOnlineAt || u.lastSeenAt || u.last_seen || null,
    lastPageUrl,
  };
};

const QUOTES = [
  "Я нашёл 10 000 способов, которые не работают. — Томас Эдисон",
  "Каждый отказ приближает меня к успеху. — Эдгар Кейси",
  "Успех — это идти от одной неудачи к другой без потери энтузиазма. — У. Черчилль",
  "Падение — часть жизни. Вставание — часть жизни успешного человека. — Зиг Зиглар",
  "Самый большой риск — не рисковать вовсе. — М. Цукерберг",
  "Кто не ошибается, обычно ничего не делает. — У. К. Магги",
  "Неудача — это просто смена курса. — Опра Уинфри",
  "Отказы перенаправляют энергию туда, где работает. — Брайан Трейси",
  "Самый верный путь к успеху — попробовать ещё раз. — Т. Эдисон",
  "Отказы учат ценить успех. — Грант Кардон",
  "В продажах «нет» — шанс сделать новое предложение. — Джон Рон",
  "Сегодня «нет» — завтра кто-то скажет «да». — Джек Кэнфилд",
  "Победители ищут способы, проигравшие — оправдания. — Ф. Д. Рузвельт",
  "Неудачи учат нас больше, чем успехи. — Тони Роббинс",
  "Неудача — не провал, а шанс начать заново. — Р. Брэнсон",
];

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
      <path d="M5 12a7 7 0 0 0 14 0M12 19v2" fill="none" stroke="currentColor" />
    </svg>
  ),
  send: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M22 2L11 13" fill="none" stroke="currentColor" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="currentColor" />
    </svg>
  ),
};

const isUserOnline = (info) =>
  info?.lastOnlineAt ? Date.now() - new Date(info.lastOnlineAt).getTime() < 2 * 60 * 1000 : false;

/* ===== helpers ===== */
const sortByDate = (arr) =>
  [...arr].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

const pickMessage = (res) => {
  const d = res?.data ?? res;
  if (!d) return null;
  if (Array.isArray(d)) return d[d.length - 1] || null;
  if (Array.isArray(d?.data)) return d.data[d.data.length - 1] || null;
  if (d?.message) return d.message;
  if (d?.data && (d.data._id || d.data.text)) return d.data;
  return (d?._id || d?.text || d?.imageUrls || d?.audioUrl) ? d : null;
};

/* аккуратное слияние: не допускаем дублей аудио/картинок/текста */
function mergeWithTmp(prev, serverArr) {
  const server = Array.isArray(serverArr) ? serverArr : [];

  const isSimilar = (tmp) =>
    server.some((s) => {
      const sameSide = !!s.fromAdmin === !!tmp.fromAdmin;
      const closeTime =
        Math.abs(new Date(s.createdAt).getTime() - new Date(tmp.createdAt).getTime()) < 20000;

      if (tmp.tempKind === "audio" || tmp.audioUrl) {
        if (!!s.audioUrl && sameSide && closeTime) return true;
      }
      if ((tmp.imageUrls?.length || 0) > 0 && (s.imageUrls?.length || 0) > 0 && sameSide && closeTime) {
        return true;
      }
      if (tmp.text && s.text && tmp.text.trim() === s.text.trim() && sameSide && closeTime) {
        return true;
      }
      return false;
    });

  const tmpLeft = prev.filter((m) => String(m._id || "").startsWith("tmp-") && !isSimilar(m));
  return sortByDate([...server, ...tmpLeft]);
}

/* ===== формат mm:ss ===== */
const fmt = (sec) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const SS = String(s % 60).padStart(2, "0");
  return `${m}:${SS}`;
};

/* ===== blob URL manager ===== */
const tmpObjectUrls = new Set();
function makeBlobUrl(blob) {
  const u = URL.createObjectURL(blob);
  tmpObjectUrls.add(u);
  return u;
}
function revokeTmpUrl(u) {
  if (u && isBlobUrl(u) && tmpObjectUrls.has(u)) {
    URL.revokeObjectURL(u);
    tmpObjectUrls.delete(u);
  }
}

/* --- голосовая «пузырь» --- */
function VoiceMessage({ audioUrl, initialDuration = 0 }) {
  const audioRef = useRef(null);
  const barRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const seekingFixApplied = useRef(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setPlaying(false);
    setCurrent(0);
    seekingFixApplied.current = false;
    if (a.readyState < 1) a.load();
  }, [audioUrl]);

  const ensureFiniteDuration = () => {
    const a = audioRef.current;
    if (!a) return;
    if (!Number.isFinite(a.duration) || a.duration === 0) {
      if (!seekingFixApplied.current) {
        seekingFixApplied.current = true;
        const onSeeked = () => {
          if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
          a.currentTime = 0;
          a.removeEventListener("seeked", onSeeked);
        };
        a.addEventListener("seeked", onSeeked);
        a.currentTime = 1e9;
      }
    } else {
      setDuration(a.duration);
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onLoaded = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration);
      } else {
        ensureFiniteDuration();
      }
    };
    const onTime = () => { if (!dragging) setCurrent(a.currentTime || 0); };
    const onEnd = () => setPlaying(false);

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("durationchange", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);

    if (a.readyState < 1) a.load();

    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("durationchange", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [dragging, audioUrl]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
  };

  const pct = duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;

  const seekToClientX = (clientX) => {
    const el = barRef.current;
    const a = audioRef.current;
    if (!el || !a || !duration) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const next = (x / rect.width) * duration;
    a.currentTime = next;
    setCurrent(next);
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    seekToClientX(e.clientX);

    const move = (ev) => seekToClientX(ev.clientX);
    const up = () => {
      setDragging(false);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  return (
    <div className="voice-bubble">
      <button
        className={`icon-btn chat-voice-btn ${playing ? "is-playing" : "is-paused"}`}
        onClick={toggle}
        title={playing ? "Пауза" : "Воспроизвести"}
      >
        {playing ? "⏸" : "▶️"}
      </button>

      <div
        className="voice-bar"
        ref={barRef}
        onPointerDown={onPointerDown}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(duration || 0))}
        aria-valuenow={Math.max(0, Math.round(current || 0))}
        tabIndex={0}
        onKeyDown={(e) => {
          const a = audioRef.current;
          if (!a) return;
          if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5);
          if (e.key === "ArrowRight") a.currentTime = Math.min(duration || 0, a.currentTime + 5);
        }}
      >
        <div className="voice-progress" style={{ width: `${pct * 100}%` }} />
        <div className="voice-thumb" style={{ left: `${pct * 100}%` }} />
      </div>

      <span className="voice-duration">{fmt(duration)}</span>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        style={{ display: "none" }}
      />
    </div>
  );
}

/* --- предпрослушка записи --- */
function AudioPreview({ blob, seconds = 0, onRemove }) {
  const [url, setUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!blob) return;
    const u = makeBlobUrl(blob);
    setUrl(u);
    return () => revokeTmpUrl(u);
  }, [blob]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
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
        title={playing ? "Пауза" : "Прослушать"}
      >
        {playing ? "⏸" : "▶️"}
      </button>
      <span className="audio-preview__label">Голосовое сообщение — {fmt(seconds)}</span>
      <button className="audio-preview__close" onClick={onRemove} title="Удалить">×</button>
      {url && <audio ref={audioRef} src={url} preload="auto" style={{ display: "none" }} />}
    </div>
  );
}

const QUICK = [
  "Ожидайте, пожалуйста. Проверяю информацию ✅",
  "Уже спешу на помощь! 🙌",
  "Спасибо за обращение! Подключаюсь 👨‍💻",
  "Можем перейти на звонок? 📞",
  "Супер, сейчас пришлю детали 📩",
  "Понимаю. Предлагаю такой вариант 👇",
  "Готово! Проверьте, пожалуйста ✅",
  "Принял, держу в курсе ⏳",
];

/* ===== метки дней ===== */
const DAYS = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
function dayLabel(d) {
  const dt = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const that = new Date(dt); that.setHours(0,0,0,0);
  const diff = Math.round((today - that) / 86400000);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  if (diff < 7 && diff > 1) return DAYS[dt.getDay()];
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  return `${dd}.${mm}`;
}

export default function AdminChatPage() {
  const { resetUnread, unread, setActiveChatId } = useAdminNotify();

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

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // popover "Сегодня/Вчера/..." при прокрутке
  const [scrollDay, setScrollDay] = useState("");
  const scrollPopTimer = useRef(null);

  const pendingOpenId = useRef(null);
  const endRef = useRef(null);
  const messagesRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordingTimer = useRef();

  const quickRef = useRef(null);
  const emojiRef = useRef(null);
  const composerRef = useRef(null);

  const firstChatsLoadRef = useRef(true);
  const firstThreadLoadRef = useRef(false);

  const emptyQuote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    []
  );

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
          lastMessage:
            c.lastMessage?.text ||
            (c.lastMessage?.imageUrls?.length ? "📷 Фото" : "") ||
            (c.lastMessage?.audioUrl ? "🎤 Голосовое" : "—"),
          lastMessageObj: c.lastMessage,
        }))
      );
      if (selected?.userId) resetUnread(selected.userId);
    } catch (e) {
      console.error("loadChats error:", e);
      setChats((prev) => prev);
      setError("Ошибка получения чатов");
    } finally {
      if (firstChatsLoadRef.current) {
        setLoadingChats(false);
        firstChatsLoadRef.current = false;
      }
    }
  };

  useEffect(() => {
    loadChats();
    const iv = setInterval(loadChats, 4000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!pendingOpenId.current || !Array.isArray(chats) || chats.length === 0) return;
    const found = chats.find((c) => String(c.userId) === String(pendingOpenId.current));
    if (found) {
      pendingOpenId.current = null;
      handleSelectChat(found);
    }
  }, [chats]);

  const loadMessages = async () => {
    if (!selected) return;
    try {
      const { data } = await api.get(`/api/chat/admin/${selected.userId}`, { params: { _: Date.now() } });
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setMessages((prev) => mergeWithTmp(prev, arr));
    } catch (e) {
      console.error("loadMessages error:", e);
    }
  };

  useEffect(() => {
    if (!selected) return;

    firstThreadLoadRef.current = true;
    setLoadingThread(true);

    const load = async () => {
      await loadMessages();
      if (firstThreadLoadRef.current) {
        setLoadingThread(false);
        firstThreadLoadRef.current = false;
      }
      try {
        const info = await api.get(`/api/chat/admin/user/${selected.userId}`, { params: { _: Date.now() } });
        setSelectedUserInfo(normalizeUserInfo(info));
      } catch {
      } finally {
        if (loadingInfo) setLoadingInfo(false);
      }
    };

    load();
    const iv = setInterval(load, 2500);
    resetUnread(selected.userId);
    return () => clearInterval(iv);
  }, [selected]);

  useEffect(() => {
    setActiveChatId(selected?.userId || null);
    return () => setActiveChatId(null);
  }, [selected, setActiveChatId]);

  const openChatById = async (userId) => {
    if (!userId) return;
    const chat = chats.find((c) => String(c.userId) === String(userId));
    if (chat) {
      handleSelectChat(chat);
    } else {
      pendingOpenId.current = String(userId);
      await loadChats();
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("openChatId");
    if (stored) {
      sessionStorage.removeItem("openChatId");
      openChatById(stored);
    }
  }, []);

  useEffect(() => {
    const onOpenInPage = (e) => {
      const id = e.detail?.chatId;
      if (id) openChatById(id);
    };
    window.addEventListener("open-chat-in-page", onOpenInPage);
    return () => window.removeEventListener("open-chat-in-page", onOpenInPage);
  }, []);

  const handleSelectChat = async (c) => {
    setSelected(c);
    setActiveChatId(c.userId);
    setFiles([]);
    setInput("");
    setShowQuick(false);
    setShowEmoji(false);
    setIsAutoScroll(true);
    setAudioPreview(null);
    setRecording(false);
    setRecordingTime(0);
    clearInterval(recordingTimer.current);
    setLoadingInfo(true);
    resetUnread(c.userId);

    try {
      const info = await api.get(`/api/chat/admin/user/${c.userId}`, { params: { _: Date.now() } });
      setSelectedUserInfo(normalizeUserInfo(info));
    } catch {
    } finally {
      setLoadingInfo(false);
    }

    try { await api.post(`/api/chat/read/${c.userId}`); } catch {}
    setTimeout(loadChats, 160);
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
      setActiveChatId(null);
    }
    await loadChats();
  };

  /* --- media recorder --- */
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

  function updateChatPreviewOptimistic(userId, payload) {
    setChats((prev) =>
      prev.map((c) =>
        c.userId === userId
          ? {
              ...c,
              lastMessageObj: {
                ...(c.lastMessageObj || {}),
                fromAdmin: true,
                text:
                  payload.text ||
                  (payload.imageUrls?.length ? "📷 Фото" : "") ||
                  (payload.audioUrl ? "🎤 Голосовое" : ""),
                read: true,
                createdAt: new Date().toISOString(),
              },
              lastMessage:
                payload.text ||
                (payload.imageUrls?.length ? "📷 Фото" : "") ||
                (payload.audioUrl ? "🎤 Голосовое" : "—"),
            }
          : c
      )
    );
  }

  const pushOptimistic = (payload) => {
    const m = {
      _id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fromAdmin: true,
      createdAt: new Date().toISOString(),
      imageUrls: payload.imageUrls || [],
      audioUrl: payload.audioUrl || "",
      text: payload.text || "",
      tempKind: payload.tempKind || null,
      _local: !!payload._local,
      _durationHint: payload._durationHint || 0,
    };
    setMessages((prev) => sortByDate([...prev, m]));
    if (selected?.userId) updateChatPreviewOptimistic(selected.userId, payload);
    setIsAutoScroll(true);
    queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    return m;
  };

  const replaceTmp = (tmpId, real) => {
    if (!real) return;
    setMessages((prev) => {
      const tmp = prev.find((x) => x._id === tmpId);
      if (tmp?._local) {
        if (Array.isArray(tmp.imageUrls)) tmp.imageUrls.forEach(revokeTmpUrl);
        revokeTmpUrl(tmp.audioUrl);
      }
      return sortByDate(prev.map((m) => (m._id === tmpId ? real : m)));
    });
    if (selected?.userId) updateChatPreviewOptimistic(selected.userId, real);
    setIsAutoScroll(true);
    queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const handleQuickReply = async (text) => {
    if (!selected) return;
    const optimistic = pushOptimistic({ text });
    try {
      const res = await api.post(`/api/chat/admin/${selected.userId}`, { text });
      await typingOff();
      const real = pickMessage(res);
      if (real && real._id) replaceTmp(optimistic._id, real);
    } catch (e) {
      console.error("quick reply error:", e);
    } finally {
      setShowQuick(false);
    }
  };

  const sendText = async () => {
    if (!input.trim() || !selected) return;
    const text = input.trim();
    const optimistic = pushOptimistic({ text });
    setInput("");
    try {
      const res = await api.post(`/api/chat/admin/${selected.userId}`, { text });
      await typingOff();
      const real = pickMessage(res);
      if (real && real._id) replaceTmp(optimistic._id, real);
    } catch (e) {
      console.error("sendText error:", e);
    }
  };

  const handleAudioSend = async () => {
    if (!audioPreview || !selected) return;

    const localUrl = makeBlobUrl(audioPreview);
    const optimistic = pushOptimistic({
      audioUrl: localUrl,
      tempKind: "audio",
      _local: true,
      _durationHint: recordingTime,
    });

    const form = new FormData();
    form.append("audio", audioPreview, "voice.webm");
    files.forEach((f) => form.append("images", f));
    setFiles([]);
    setAudioPreview(null);
    setRecordingTime(0);

    try {
      const res = await api.post(`/api/chat/admin/${selected.userId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await typingOff();
      const real = pickMessage(res);
      if (real && real._id) replaceTmp(optimistic._id, real);
    } catch (e) {
      console.error("audio send error:", e);
    }
  };

  const sendMedia = async ({ audio, images }) => {
    if (!selected) return;

    const localImageUrls = (images || []).map((f) => makeBlobUrl(f));
    const localAudioUrl = audio ? makeBlobUrl(audio) : "";

    const optimistic = pushOptimistic({
      text: input.trim() || "",
      imageUrls: localImageUrls,
      audioUrl: localAudioUrl,
      tempKind: audio ? "audio" : null,
      _local: true,
    });

    const form = new FormData();
    if (input.trim()) form.append("text", input.trim());
    if (audio) form.append("audio", audio, "voice.webm");
    (images || []).forEach((f) => form.append("images", f));
    setFiles([]);
    setInput("");

    try {
      const res = await api.post(`/api/chat/admin/${selected.userId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await typingOff();
      const real = pickMessage(res);
      if (real && real._id) replaceTmp(optimistic._id, real);
    } catch (e) {
      console.error("sendMedia error:", e);
    }
  };

  const handleSend = () => {
    if (recording) {
      startOrStopRecording();
      return;
    }
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

  useEffect(() => {
    if (isAutoScroll) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAutoScroll]);

  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;

    // авто-скролл выключаем, если пользователь листает
    setIsAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 100);

    // вычисляем текущую "дату" для поповера (как в Телеге)
    const seps = Array.from(el.querySelectorAll(".day-sep"));
    let current = null;
    const threshold = 60; // чуть ниже верхней границы ленты
    seps.forEach((s) => {
      const relTop = s.offsetTop - el.scrollTop;
      if (relTop <= threshold) current = s;
    });
    const label = current?.dataset?.label || "";
    if (label) {
      setScrollDay(label);
      if (scrollPopTimer.current) clearTimeout(scrollPopTimer.current);
      scrollPopTimer.current = setTimeout(() => setScrollDay(""), 1200);
    }
  };

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

  useEffect(() => {
    const onDoc = (e) => {
      const t = e.target;
      if (showQuick && quickRef.current && !quickRef.current.contains(t)) setShowQuick(false);
      if (showEmoji) {
        const inEmoji = emojiRef.current && emojiRef.current.contains(t);
        const inComposer = composerRef.current && composerRef.current.contains(t);
        if (!inEmoji && !inComposer) setShowEmoji(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [showQuick, showEmoji]);

  const clientTyping = useMemo(() => {
    if (!selected) return false;
    const s = typingMap?.[selected.userId];
    return !!(s && s.isTyping && !s.fromAdmin);
  }, [typingMap, selected]);

  if (error) return <div className="admin-chat-error">{error}</div>;

  const chatList = Array.isArray(chats) ? chats : [];
  const pageHref = selectedUserInfo?.lastPageUrl ? withSite(selectedUserInfo.lastPageUrl) : null;

  /* список с day separators */
  const threadItems = useMemo(() => {
    const out = [];
    let prevDay = "";
    for (const m of messages) {
      const dKey = new Date(m.createdAt || Date.now()).toDateString();
      if (dKey !== prevDay) {
        prevDay = dKey;
        out.push({ type: "sep", key: `sep-${dKey}`, label: dayLabel(m.createdAt || Date.now()) });
      }
      out.push({ type: "msg", key: m._id || Math.random(), msg: m });
    }
    return out;
  }, [messages]);

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
                      </div>
                      <div className="chat-phone">{c.phone}</div>
                      <div className="chat-last">{(c.lastMessage || "").slice(0, 64)}</div>
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
            {loadingChats && <div className="area-loader"><span className="chat-spinner chat-spinner--md" /></div>}
          </div>
        </aside>

        {/* CENTER */}
        <section className="chat-main">
          {/* popover текущей даты при скролле */}
          {!!scrollDay && <div className="scroll-day-pop show">{scrollDay}</div>}

          {!selected ? (
            <div className="chat-empty">
              <div className="empty-quote">
                <div className="empty-quote__title">Выберите чат слева</div>
                <div className="empty-quote__text">“{emptyQuote}”</div>
              </div>
            </div>
          ) : (
            <>
              <header className="chat-topbar admin-topbar">
                <div className="chat-topbar__title">
                  <strong>{selected.name}</strong>
                  {clientTyping && (
                    <div className="chat-typing">
                      {selected.name} печатает
                      <span className="dots"><i></i><i></i><i></i></span>
                    </div>
                  )}
                </div>

                <div className="chat-actions">
                  <div className={`quick ${showQuick ? "open" : ""}`} ref={quickRef}>
                    <button className="btn-outline" onClick={() => setShowQuick((v) => !v)}>
                      Быстрый ответ
                    </button>
                    {showQuick && (
                      <div className="quick-menu">
                        {QUICK.map((q, i) => (
                          <button key={i} onClick={() => handleQuickReply(q)} title={q}>{q}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="thread" ref={messagesRef} onScroll={handleScroll}>
                {threadItems.map((it) => {
                  if (it.type === "sep") {
                    return (
                      <div className="day-sep" key={it.key} data-label={it.label}>
                        <span>{it.label}</span>
                      </div>
                    );
                  }
                  const m = it.msg;
                  return (
                    <div
                      key={it.key}
                      className={`bubble ${m.fromAdmin ? "out" : "in"}`}
                    >
                      <div className="bubble-author">{m.fromAdmin ? "Менеджер" : selected.name}</div>
                      {m.text && <div className="bubble-text">{m.text}</div>}

                      {m.imageUrls?.map((u, idx) => {
                        const src = isBlobUrl(u) || isExternalUrl(u) ? u : withApi(u);
                        return <img key={idx} src={src} alt="img" className="bubble-img" />;
                      })}

                      {m.audioUrl && (
                        <VoiceMessage
                          audioUrl={withApi(m.audioUrl)}
                          initialDuration={m._durationHint || 0}
                        />
                      )}

                      <div className="bubble-time">
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    </div>
                  );
                })}

                {/* typing bubble */}
                {clientTyping && (
                  <div className="bubble in typing-bubble" aria-live="polite">
                    <div className="typing-dots"><span></span><span></span><span></span></div>
                  </div>
                )}

                <div ref={endRef} />
                {loadingThread && <div className="loading-overlay"><span className="chat-spinner chat-spinner--md" /></div>}
              </div>

              {files.length > 0 && (
                <div className="previews">
                  {files.map((file, i) => (
                    <div className="preview" key={i}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        onLoad={(e)=>URL.revokeObjectURL(e.currentTarget.src)}
                      />
                      <button className="preview__close" onClick={() => removeFile(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="composer" ref={composerRef}>
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

                {audioPreview && (
                  <AudioPreview
                    blob={audioPreview}
                    seconds={recordingTime}
                    onRemove={() => setAudioPreview(null)}
                  />
                )}

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
                  title={recording ? `Остановить запись (${fmt(recordingTime)})` : "Записать голосовое"}
                >
                  {Svg.mic}
                  {recording && <span className="mic__badge">{fmt(recordingTime)}</span>}
                </button>

                {!recording ? (
                  <button
                    className="send-btn"
                    onClick={handleSend}
                    title="Отправить"
                  >
                    {Svg.send}
                  </button>
                ) : (
                  <button
                    className="rec-stop"
                    onClick={handleSend}
                    title="Остановить запись"
                    aria-label="Остановить запись"
                  />
                )}
              </div>

              {showEmoji && (
                <div className="emoji-popover" ref={emojiRef}>
                  <Picker
                    onEmojiClick={(emojiData) => {
                      setInput((v) => v + emojiData.emoji);
                      setShowEmoji(false);
                    }}
                    width={320}
                    height={260}
                    searchDisabled
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                    lazyLoadEmojis
                  />
                </div>
              )}
            </>
          )}
        </section>

        {/* RIGHT */}
        {selected && (
          <aside className="user-panel">
            {loadingInfo && <div className="area-loader"><span className="chat-spinner chat-spinner--md" /></div>}

            {selectedUserInfo && (
              <>
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
                  <div className="user-link-row">
                    <b>Страница:</b>{" "}
                    {pageHref ? (
                      <a className="user-link" href={pageHref} target="_blank" rel="noreferrer">Перейти ↗</a>
                    ) : ("—")}
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
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

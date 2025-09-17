// context/AdminNotifyContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

const apiUrl = import.meta.env.VITE_API_URL || "";

const AdminNotifyContext = createContext();

export function useAdminNotify() {
  return useContext(AdminNotifyContext);
}

// --- Badge (счётчик) ---
export function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span
      style={{
        background: "#f43f5e",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        borderRadius: "10px",
        padding: "1px 7px",
        marginLeft: 8,
        minWidth: 18,
        display: "inline-block",
        textAlign: "center",
        lineHeight: "20px",
        verticalAlign: "middle",
        boxShadow: "0 1px 5px #0002",
      }}
    >
      {count}
    </span>
  );
}

/* ===================== iOS/macOS style Toast ===================== */

function Toast({ message, onClose, type = "msg", ttl = 3200 }) {
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef(null);

  // авто-скрытие + прогресс
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), ttl);
    const t2 = setTimeout(onClose, ttl + 220);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [ttl, onClose]);

  // свайп вниз для скрытия
  const startY = useRef(0);
  const deltaY = useRef(0);

  const onPointerDown = (e) => {
    startY.current = e.clientY || e.touches?.[0]?.clientY || 0;
    deltaY.current = 0;
    rootRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!startY.current) return;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - startY.current;
    deltaY.current = Math.max(0, y);
    const el = rootRef.current;
    if (el) {
      el.style.transform = `translateY(${deltaY.current}px)`;
      el.style.opacity = String(Math.max(0.45, 1 - deltaY.current / 180));
    }
  };
  const endGesture = () => {
    const el = rootRef.current;
    if (!el) return;
    if (deltaY.current > 80) {
      setLeaving(true);
      setTimeout(onClose, 180);
    } else {
      el.style.transform = "";
      el.style.opacity = "";
    }
    startY.current = 0;
    deltaY.current = 0;
  };

  const { icon, accentClass, label } = mapType(type);

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      className={`ios-toast ${leaving ? "ios-toast--leave" : ""} ${accentClass}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onTouchStart={onPointerDown}
      onTouchMove={onPointerMove}
      onTouchEnd={endGesture}
      tabIndex={0}
    >
      <div className="ios-toast__icon">{icon}</div>
      <div className="ios-toast__body">
        <div className="ios-toast__title">{label}</div>
        <div className="ios-toast__text">{message}</div>
      </div>
      <button className="ios-toast__close" onClick={() => { setLeaving(true); setTimeout(onClose, 180); }} aria-label="Закрыть">
        ×
      </button>
      <div className="ios-toast__progress" style={{ ["--ttl"]: `${ttl}ms` }} />
      {/* styles */}
      <style>{toastCss}</style>
    </div>
  );
}

function mapType(t) {
  switch (t) {
    case "order":
      return {
        label: "Новый заказ",
        accentClass: "accent--green",
        icon: (
          <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
            <path d="M3 6h18l-1.5 12.5A2 2 0 0 1 17.5 20h-11A2 2 0 0 1 4 18.5L3 6z" fill="currentColor"/>
            <path d="M8 6l1.2-2h5.6L16 6" fill="currentColor" opacity=".7"/>
          </svg>
        ),
      };
    case "cancel":
      return {
        label: "Отмена заказа",
        accentClass: "accent--red",
        icon: (
          <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".9"/>
            <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ),
      };
    default:
      return {
        label: "Новое сообщение",
        accentClass: "accent--blue",
        icon: (
          <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
            <path d="M3 5h18v10H7l-4 4V5z" fill="currentColor"/>
          </svg>
        ),
      };
  }
}

const toastCss = `
:root { --ios-bg: rgba(28,28,30,0.85); --ios-fg: #fff; --ios-muted: #d1d1d6; }
@media (prefers-color-scheme: light) {
  :root { --ios-bg: rgba(248,248,250,0.9); --ios-fg: #111; --ios-muted: #6e6e73; }
}
.ios-toast {
  pointer-events: auto;
  color: var(--ios-fg);
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 12px;
  align-items: center;
  min-width: 280px;
  max-width: 420px;
  padding: 12px 14px 14px 12px;
  border-radius: 18px;
  background: var(--ios-bg);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
  backdrop-filter: saturate(180%) blur(18px);
  box-shadow: 0 10px 30px rgba(0,0,0,.25), 0 1px 0 rgba(255,255,255,.06) inset;
  animation: ios-in .32s cubic-bezier(.32,1.22,.26,1) both;
  border: 1px solid rgba(255,255,255,.12);
  position: relative;
}
.ios-toast--leave { animation: ios-out .18s ease both; }
.ios-toast__icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: grid; place-items: center;
  color: #fff;
  background: linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0)) padding-box,
              var(--accent) border-box;
  border: 1px solid transparent;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.12), 0 6px 16px rgba(0,0,0,.25);
}
.accent--blue  { --accent: linear-gradient(135deg,#0a84ff,#3a7bfd); }
.accent--green { --accent: linear-gradient(135deg,#34c759,#30d158); }
.accent--red   { --accent: linear-gradient(135deg,#ff375f,#ff453a); }
.ios-toast__body { display:flex; flex-direction:column; gap:2px; }
.ios-toast__title { font-weight: 600; font-size: 14px; opacity: .95; letter-spacing: .2px; }
.ios-toast__text { font-size: 14px; color: var(--ios-fg); opacity: .9; line-height: 1.25; }
.ios-toast__close {
  appearance: none; border: 0; outline: none; background: transparent; color: var(--ios-muted);
  font-size: 20px; line-height: 1; padding: 2px 6px; border-radius: 8px; cursor: pointer;
}
.ios-toast__close:hover { color: var(--ios-fg); }
.ios-toast__progress {
  position: absolute; left: 10px; right: 10px; bottom: 8px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, rgba(255,255,255,.65), rgba(255,255,255,.25));
  transform-origin: left; animation: ios-ttl var(--ttl) linear both;
  opacity: .8;
}
@keyframes ios-ttl { from{transform: scaleX(1);} to{transform: scaleX(0);} }
@keyframes ios-in {
  from { opacity: 0; transform: translateY(-14px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ios-out {
  to { opacity: 0; transform: translateY(-8px) scale(.98); }
}
@media (prefers-reduced-motion: reduce) {
  .ios-toast { animation: none; }
  .ios-toast__progress { animation: none; display: none; }
}
`;

/* ===================== /iOS Toast ===================== */

export function AdminNotifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState({});
  const [lastUnreadChat, setLastUnreadChat] = useState(null);

  // 🔇 активный чат (не уведомляем по нему)
  const [activeChatId, setActiveChatId] = useState(null);
  const activeChatIdRef = useRef(null);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  const audioMsgRef = useRef();
  const audioOrderRef = useRef();
  const audioCancelRef = useRef();

  // --- Чаты ---
  const lastNotifiedMsgRef = useRef({});
  const firstLoadChats = useRef(true);

  useEffect(() => {
    async function pollChats() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${apiUrl}/api/chat/admin`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const chats = Array.isArray(data)
          ? data.map((c) => ({ ...c, lastMessageObj: c.lastMessage }))
          : [];

        // Первый заход — только фиксируем состояние
        if (firstLoadChats.current) {
          chats.forEach((chat) => {
            if (chat.lastMessageObj && !chat.lastMessageObj.fromAdmin && !chat.lastMessageObj.read) {
              lastNotifiedMsgRef.current[chat.userId] = chat.lastMessageObj._id;
            }
          });
          firstLoadChats.current = false;

          const openId = activeChatIdRef.current;
          const initialUnread = {};
          chats.forEach((chat) => {
            const lm = chat.lastMessageObj;
            if (lm && !lm.fromAdmin && !lm.read && chat.userId !== openId) {
              initialUnread[chat.userId] = 1;
            }
          });
          setUnread(initialUnread);
          return;
        }

        // Новые входящие
        const openId = activeChatIdRef.current;
        chats.forEach((chat) => {
          const lm = chat.lastMessageObj;
          if (lm && !lm.fromAdmin && !lm.read) {
            const prevId = lastNotifiedMsgRef.current[chat.userId];
            if (prevId !== lm._id) {
              if (chat.userId === openId) {
                // Открытый чат — без тоста/бейджа
                lastNotifiedMsgRef.current[chat.userId] = lm._id;
                return;
              }
              notify(`От ${chat.name || chat.phone || "клиента"}`, "msg");
              incrementUnread(chat.userId);
              setLastUnreadChat(chat.userId);
              lastNotifiedMsgRef.current[chat.userId] = lm._id;
            }
          }
        });

        // Пересчёт unread (игнор открытого чата)
        const unreadObj = {};
        chats.forEach((chat) => {
          const lm = chat.lastMessageObj;
          if (lm && !lm.fromAdmin && !lm.read && chat.userId !== activeChatIdRef.current) {
            unreadObj[chat.userId] = 1;
          }
        });
        setUnread(unreadObj);
      } catch {}
    }
    pollChats();
    const interval = setInterval(pollChats, 3500);
    return () => clearInterval(interval);
  }, []);

  const incrementUnread = useCallback((userId) => {
    setUnread((u) => ({ ...u, [userId]: 1 }));
  }, []);
  const resetUnread = useCallback((userId) => {
    setUnread((u) => {
      const nu = { ...u };
      delete nu[userId];
      return nu;
    });
    sessionStorage.setItem("admin-selected-user", userId);
    setLastUnreadChat(null);
  }, []);
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // --- Заказы ---
  const [newOrders, setNewOrders] = useState([]);
  const prevOrdersRef = useRef([]);
  const firstLoadOrders = useRef(true);

  useEffect(() => {
    async function pollOrders() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(
          `${apiUrl}/api/orders/admin?status=new&sort=desc&page=1&limit=15`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const onlyNew = Array.isArray(data)
          ? data.filter((o) => o.status === "new")
          : Array.isArray(data.orders)
          ? data.orders
          : [];
        setNewOrders(onlyNew);

        if (!firstLoadOrders.current) {
          const prevIds = prevOrdersRef.current.map((o) => o._id);
          onlyNew.forEach((o) => {
            if (!prevIds.includes(o._id)) {
              notify(`Новый заказ №${o._id.slice(-6)}`, "order");
            }
          });
        }
        prevOrdersRef.current = onlyNew;
        if (firstLoadOrders.current) firstLoadOrders.current = false;
      } catch {}
    }
    pollOrders();
    const interval = setInterval(pollOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const totalNewOrders = newOrders.length;

  // --- Отменённые заказы ---
  const prevCancelledRef = useRef([]);
  const firstLoadCancelled = useRef(true);

  useEffect(() => {
    async function pollCancelled() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(
          `${apiUrl}/api/orders/admin?status=cancelled&sort=desc&page=1&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const cancelled = Array.isArray(data)
          ? data.filter((o) => o.status === "cancelled")
          : Array.isArray(data.orders)
          ? data.orders
          : [];

        if (!firstLoadCancelled.current) {
          const prevIds = prevCancelledRef.current.map((o) => o._id);
          cancelled.forEach((o) => {
            if (!prevIds.includes(o._id)) {
              notify(
                `Отмена №${o._id.slice(-6)}${o.cancelReason ? ` (${o.cancelReason})` : ""}`,
                "cancel"
              );
            }
          });
        }
        prevCancelledRef.current = cancelled;
        if (firstLoadCancelled.current) firstLoadCancelled.current = false;
      } catch {}
    }
    pollCancelled();
    const interval = setInterval(pollCancelled, 4000);
    return () => clearInterval(interval);
  }, []);

  // --- Уведомления ---
  const notify = useCallback((msg, type = "msg") => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), msg, type }]);
    try {
      if (type === "order" && audioOrderRef.current) {
        audioOrderRef.current.currentTime = 0; audioOrderRef.current.play();
      } else if (type === "msg" && audioMsgRef.current) {
        audioMsgRef.current.currentTime = 0; audioMsgRef.current.play();
      } else if (type === "cancel" && audioCancelRef.current) {
        audioCancelRef.current.currentTime = 0; audioCancelRef.current.play();
      }
    } catch {}
  }, []);
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <AdminNotifyContext.Provider
      value={{
        notify,
        incrementUnread,
        resetUnread,
        unread,
        totalUnread,
        lastUnreadChat,
        totalNewOrders,
        activeChatId,
        setActiveChatId,
      }}
    >
      {children}

      {/* аудио */}
      <audio ref={audioMsgRef} src="/notify.mp3" preload="auto" />
      <audio ref={audioOrderRef} src="/order.mp3" preload="auto" />
      <audio ref={audioCancelRef} src="/cancelOrder.mp3" preload="auto" />

      {/* стек тостов — позиционирование как у баннеров macOS */}
      <div className="ios-toast-stack">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.msg}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>

      <style>{stackCss}</style>
    </AdminNotifyContext.Provider>
  );
}

const stackCss = `
.ios-toast-stack {
  position: fixed;
  top: 18px;
  right: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10000;
  pointer-events: none; /* отдельные тосты сами включают pointer-events */
}
@media (max-width: 640px) {
  .ios-toast-stack {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    top: 14px;
  }
}
`;

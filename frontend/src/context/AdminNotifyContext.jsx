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

// --- Toast ---
function Toast({ message, onClose }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 1400);
    const t2 = setTimeout(onClose, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  return (
    <div className={`tg-toast${hide ? " hide" : ""}`} onClick={onClose} tabIndex={0} style={{ pointerEvents: "auto" }}>
      <span className="tg-toast-icon">🔔</span>
      <span className="tg-toast-text">{message}</span>
      <style>{`
        .tg-toast { background: rgba(30,41,59,0.96); color:#fff; font-size:16px; padding:14px 28px 14px 18px;
          border-radius:14px; box-shadow:0 8px 36px #09142829, 0 1.5px 8px #1113; display:flex; align-items:center;
          min-width:210px; max-width:400px; cursor:pointer; animation:tgtoast-in .32s cubic-bezier(.8,1.5,.9,1) both;
          opacity:1; transition:opacity .3s, transform .5s; margin-bottom:8px; }
        .tg-toast.hide { opacity:0; transform:translateY(-10px) scale(.96); }
        .tg-toast-icon { font-size:21px; margin-right:12px; }
        @keyframes tgtoast-in { from{opacity:0;transform:translateY(-16px) scale(.93);} to{opacity:1;transform:translateY(0) scale(1);} }
      `}</style>
    </div>
  );
}

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

        // На первом заходе просто запоминаем, без уведомлений
        if (firstLoadChats.current) {
          chats.forEach((chat) => {
            if (chat.lastMessageObj && !chat.lastMessageObj.fromAdmin && !chat.lastMessageObj.read) {
              lastNotifiedMsgRef.current[chat.userId] = chat.lastMessageObj._id;
            }
          });
          firstLoadChats.current = false;
          // но не забываем проставить текущий unread из сервера
          const openId = activeChatIdRef.current;
          const initialUnread = {};
          chats.forEach((chat) => {
            if (
              chat.lastMessageObj &&
              !chat.lastMessageObj.fromAdmin &&
              !chat.lastMessageObj.read &&
              chat.userId !== openId
            ) {
              initialUnread[chat.userId] = 1;
            }
          });
          setUnread(initialUnread);
          return;
        }

        // Новые входящие сообщения
        const openId = activeChatIdRef.current;
        chats.forEach((chat) => {
          const lm = chat.lastMessageObj;
          if (lm && !lm.fromAdmin && !lm.read) {
            const prevId = lastNotifiedMsgRef.current[chat.userId];
            if (prevId !== lm._id) {
              // если чат открыт — не показываем тост и не увеличиваем unread
              if (chat.userId === openId) {
                lastNotifiedMsgRef.current[chat.userId] = lm._id; // помечаем, чтобы не тостить потом
                return;
              }
              notify(`Новое сообщение от ${chat.name || chat.phone || "клиента"}`, "msg");
              incrementUnread(chat.userId);
              setLastUnreadChat(chat.userId);
              lastNotifiedMsgRef.current[chat.userId] = lm._id;
            }
          }
        });

        // Пересобираем карту непрочитанных (но игнорим открытый чат)
        const unreadObj = {};
        chats.forEach((chat) => {
          const lm = chat.lastMessageObj;
          if (lm && !lm.fromAdmin && !lm.read && chat.userId !== openId) {
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
              notify(`Поступил новый заказ №${o._id.slice(-6)}`, "order");
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
                `Клиент отменил заказ №${o._id.slice(-6)}${o.cancelReason ? ` (${o.cancelReason})` : ""}`,
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
        // 🔇 экспортируем управление активным чатом
        activeChatId,
        setActiveChatId,
      }}
    >
      {children}
      <audio ref={audioMsgRef} src="/notify.mp3" preload="auto" />
      <audio ref={audioOrderRef} src="/order.mp3" preload="auto" />
      <audio ref={audioCancelRef} src="/cancelOrder.mp3" preload="auto" />
      <div style={{ position: "fixed", top: 40, left: "50%", transform: "translateX(-50%)", zIndex: 10000, pointerEvents: "none" }}>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.msg} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </AdminNotifyContext.Provider>
  );
}

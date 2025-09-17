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

/* ===== Toast ===== */
function Toast({ data, onClose, onClick }) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 1200);
    const t2 = setTimeout(() => onClose?.(), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  return (
    <div
      className={`tg-toast${hide ? " hide" : ""}`}
      onClick={() => { onClick?.(); onClose?.(); }}
      tabIndex={0}
      style={{ pointerEvents: "auto" }}
    >
      <span className="tg-toast-icon">
        {data.type === "order" ? "🧾" : data.type === "cancel" ? "⚠️" : "💬"}
      </span>
      <div className="tg-toast-texts">
        <div className="tg-toast-title">{data.title || data.msg}</div>
        {data.subtitle && <div className="tg-toast-sub">{data.subtitle}</div>}
      </div>

      <style>{`
        .tg-toast {
          background: rgba(30,41,59,0.96);
          color:#fff;
          padding:10px 14px 10px 12px;
          border-radius:14px;
          box-shadow:0 8px 36px #09142829, 0 1.5px 8px #1113;
          display:flex; align-items:center; gap:10px;
          min-width:240px; max-width:420px;
          cursor:pointer;
          animation: tgtoast-in .28s cubic-bezier(.8,1.5,.9,1) both;
          opacity:1; transition:opacity .25s, transform .4s;
          margin-bottom:8px;
        }
        .tg-toast.hide { opacity:0; transform:translateY(-6px) scale(.98); }
        .tg-toast-icon { font-size:18px; }
        .tg-toast-title { font-size:14px; font-weight:700; line-height:1.1; }
        .tg-toast-sub { font-size:12.5px; color:#d1d5db; line-height:1.15; margin-top:2px; }
        @keyframes tgtoast-in {
          from {opacity:0; transform:translateY(-10px) scale(.94);}
          to   {opacity:1; transform:translateY(0)     scale(1);}
        }
      `}</style>
    </div>
  );
}

/* ===== Provider ===== */
export function AdminNotifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState({});
  const [lastUnreadChat, setLastUnreadChat] = useState(null);

  // активный чат (не уведомляем по нему)
  const [activeChatId, setActiveChatId] = useState(null);
  const activeChatIdRef = useRef(null);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  // канал "открыть чат"
  const [openChatRequest, setOpenChatRequest] = useState(null);
  const clearOpenChatRequest = useCallback(() => setOpenChatRequest(null), []);
  const requestOpenChat = useCallback((chatId) => {
    setOpenChatRequest({ chatId: String(chatId), ts: Date.now() });
  }, []);

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

        // первое получение — без тостов
        if (firstLoadChats.current) {
          chats.forEach((chat) => {
            if (chat.lastMessageObj && !chat.lastMessageObj.fromAdmin && !chat.lastMessageObj.read) {
              lastNotifiedMsgRef.current[String(chat.userId)] = chat.lastMessageObj._id;
            }
          });
          firstLoadChats.current = false;

          const openId = String(activeChatIdRef.current || "");
          const initialUnread = {};
          chats.forEach((chat) => {
            const lm = chat.lastMessageObj;
            if (lm && !lm.fromAdmin && !lm.read && String(chat.userId) !== openId) {
              initialUnread[String(chat.userId)] = 1;
            }
          });
          setUnread(initialUnread);
          return;
        }

        // новые входящие
        const openId = String(activeChatIdRef.current || "");
        chats.forEach((chat) => {
          const lm = chat.lastMessageObj;
          if (lm && !lm.fromAdmin && !lm.read) {
            const key = String(chat.userId);
            const prevId = lastNotifiedMsgRef.current[key];
            if (prevId !== lm._id) {
              if (key === openId) {
                lastNotifiedMsgRef.current[key] = lm._id;
                return; // чат открыт — молчим
              }
              // тост с chatId, по клику откроем
              notify(`Новое сообщение от ${chat.name || chat.phone || "клиента"}`, "msg", {
                chatId: key,
                title: "Новое сообщение",
                subtitle: chat.name || chat.phone || "Клиент",
              });
              incrementUnread(key);
              setLastUnreadChat(key);
              lastNotifiedMsgRef.current[key] = lm._id;
            }
          }
        });

        // актуализируем карту непрочитанных
        const unreadObj = {};
        chats.forEach((chat) => {
          const lm = chat.lastMessageObj;
          if (lm && !lm.fromAdmin && !lm.read && String(chat.userId) !== String(openId)) {
            unreadObj[String(chat.userId)] = 1;
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
    const key = String(userId);
    setUnread((u) => ({ ...u, [key]: 1 }));
  }, []);
  const resetUnread = useCallback((userId) => {
    const key = String(userId);
    setUnread((u) => {
      const nu = { ...u };
      delete nu[key];
      return nu;
    });
    sessionStorage.setItem("admin-selected-user", key);
    setLastUnreadChat(null);
  }, []);
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // --- Заказы (как было) ---
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
          : Array.isArray(data.orders) ? data.orders : [];

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

  // --- Отменённые (как было) ---
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
          : Array.isArray(data.orders) ? data.orders : [];

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
  const notify = useCallback((msg, type = "msg", extra = {}) => {
    const t = { id: Date.now() + Math.random(), msg, type, ...extra };
    setToasts((prev) => {
      const next = [...prev, t];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
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
        openChatRequest,
        clearOpenChatRequest,
      }}
    >
      {children}

      <audio ref={audioMsgRef} src="/notify.mp3" preload="auto" />
      <audio ref={audioOrderRef} src="/order.mp3" preload="auto" />
      <audio ref={audioCancelRef} src="/cancelOrder.mp3" preload="auto" />

      {/* центр сверху */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <Toast
              data={t}
              onClose={() => removeToast(t.id)}
              onClick={() => { if (t.chatId) requestOpenChat(String(t.chatId)); }}
            />
          </div>
        ))}
      </div>
    </AdminNotifyContext.Provider>
  );
}

import { useAdminNotify } from "./AdminNotifyContext";
import { useEffect, useRef } from "react";

const apiUrl = import.meta.env.VITE_API_URL || '';

export function useGlobalChatNotifications() {
  const { notify, incrementUnread, unread } = useAdminNotify();
  const prevMsgIds = useRef({});
  const token = localStorage.getItem("token");

  useEffect(() => {
    let timer = setInterval(fetchNewMessages, 4000);
    fetchNewMessages();
    return () => clearInterval(timer);

    async function fetchNewMessages() {
      let chats = [];
      try {
        const res = await fetch(`${apiUrl}/api/chat/admin`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status !== 200) return;
        chats = await res.json();
        if (!Array.isArray(chats)) return;
      } catch (e) {
        return;
      }
      for (const c of chats) {
        if (!c.lastMessage || c.lastMessage.fromAdmin) continue;
        if (prevMsgIds.current[c.userId] !== c.lastMessage._id) {
          prevMsgIds.current[c.userId] = c.lastMessage._id;
          if (!unread[c.userId]) {
            incrementUnread(c.userId);
            notify(`Новое сообщение от ${c.name || c.phone || "клиента"}: ${c.lastMessage.text ? c.lastMessage.text.slice(0, 50) : "файл/аудио"}`);
          }
        }
      }
    }
  }, [incrementUnread, notify, unread, token]);
}

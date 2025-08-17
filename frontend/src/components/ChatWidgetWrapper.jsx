// src/components/ChatWidgetWrapper.jsx

import React, { useState } from 'react';
import { useSite } from "../context/SiteContext";
import ChatIcon from "./ChatIcon";
import ChatWindow from "./ChatWindow";

// Weekday keys: ['mon', 'tue', ...]
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
function getTodayKey() {
  const d = new Date();
  return WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

export default function ChatWidgetWrapper() {
  const [open, setOpen] = useState(false);
  const { chatSettings, display } = useSite();

  // Скрыть в админке (по location.pathname)
  if (window.location.pathname.startsWith('/admin')) return null;
  if (!display?.chat) return null;

  // Проверка рабочий день/время
  const todayKey = getTodayKey();
  const isWorkDay = chatSettings?.workDays?.includes(todayKey);

  let isWorkTime = false;
  if (isWorkDay) {
    const now = new Date();
    const [h, m] = (chatSettings?.startTime || "09:00").split(':').map(Number);
    const [eh, em] = (chatSettings?.endTime || "18:00").split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const end = new Date();
    end.setHours(eh, em, 59, 999);
    isWorkTime = now >= start && now <= end;
  }

  if (!isWorkDay || !isWorkTime) return null;

  // Позиция иконки (left/right)
  const side = chatSettings?.iconPosition || 'left';
  // Цвет для всей области чата
  const color = chatSettings?.color || "#2291ff";

  // Всё оборачиваем в div с переменной --chat-main-color
  return (
    <div style={{ '--chat-main-color': color }}>
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 30,
            [side]: 30,
            zIndex: 1000,
          }}
        >
          <ChatWindow onClose={() => setOpen(false)} />
        </div>
      )}
      {!open && (
        <div
          style={{
            position: 'fixed',
            bottom: 30,
            [side]: 30,
            zIndex: 1000,
          }}
        >
          <ChatIcon onClick={() => setOpen(true)} />
        </div>
      )}
    </div>
  );
}

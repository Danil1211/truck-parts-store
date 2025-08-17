// src/context/SiteContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

/* ===========================
   ДЕФОЛТЫ (без cart-* ключей)
=========================== */

export const DISPLAY_DEFAULT = {
  categories: true,
  showcase: true,
  promos: true,
  blog: true,
  chat: true,
  palette: {
    primary: "#2291ff",
    "primary-dark": "#1275be",
    accent: "#3fd9d6",
    title: "#18446e",
    "title-alt": "#2175f3",
    secondary: "#f6fafd",
    bg: "#f7fafd",
    "bg-card": "#fff",
    "side-menu-border": "#2291ff",

    // footer
    "footer-bg": "rgba(33,44,56,0.88)",
    "footer-title": "rgba(245,248,250,0.93)",
    "footer-text": "rgba(179,190,208,0.80)",
    "footer-link": "rgba(194,210,233,0.82)",
    "footer-link-hover": "rgba(228,234,240,0.92)",
    "footer-dayoff": "rgba(230,113,113,0.74)",
    "footer-bottom-bg": "rgba(26,34,42,0.89)",
    "footer-bottom": "rgba(163,173,185,0.80)",
    "footer-border": "rgba(44,54,65,0.60)",

    "block-border": "#e3f1ff",
  },
  template: "standard",
};

export const PALETTES = {
  "#2291ff": { ...DISPLAY_DEFAULT.palette },
  "#4caf50": {
    primary: "#4caf50",
    "primary-dark": "#398c3c",
    accent: "#bfffc2",
    title: "#234d2c",
    "title-alt": "#51c071",
    secondary: "#effff4",
    bg: "#f7fff9",
    "bg-card": "#fff",
    "side-menu-border": "#4caf50",
    "footer-bg": "rgba(39,57,44,0.88)",
    "footer-title": "rgba(232,245,234,0.93)",
    "footer-text": "rgba(182,198,182,0.78)",
    "footer-link": "rgba(203,232,198,0.80)",
    "footer-link-hover": "rgba(234,251,230,0.90)",
    "footer-dayoff": "rgba(210,116,116,0.75)",
    "footer-bottom-bg": "rgba(28,37,30,0.89)",
    "footer-bottom": "rgba(168,193,167,0.80)",
    "footer-border": "rgba(50,71,57,0.60)",
    "block-border": "#d3f5de",
  },
  "#ff9800": {
    primary: "#ff9800",
    "primary-dark": "#a86000",
    accent: "#ffd4a3",
    title: "#704800",
    "title-alt": "#ffa235",
    secondary: "#fff5e4",
    bg: "#fff9f1",
    "bg-card": "#fff",
    "side-menu-border": "#ff9800",
    "footer-bg": "rgba(107,73,30,0.87)",
    "footer-title": "rgba(246,237,226,0.93)",
    "footer-text": "rgba(199,185,156,0.79)",
    "footer-link": "rgba(227,207,177,0.80)",
    "footer-link-hover": "rgba(255,247,230,0.90)",
    "footer-dayoff": "rgba(222,138,138,0.74)",
    "footer-bottom-bg": "rgba(81,64,28,0.88)",
    "footer-bottom": "rgba(194,177,138,0.80)",
    "footer-border": "rgba(145,121,80,0.58)",
    "block-border": "#ffe1b0",
  },
  "#f44336": {
    primary: "#f44336",
    "primary-dark": "#af1d16",
    accent: "#ffd5d3",
    title: "#78251c",
    "title-alt": "#e8574f",
    secondary: "#fff0ef",
    bg: "#fff7f6",
    "bg-card": "#fff",
    "side-menu-border": "#f44336",
    "footer-bg": "rgba(107,52,52,0.86)",
    "footer-title": "rgba(249,234,234,0.93)",
    "footer-text": "rgba(194,176,176,0.79)",
    "footer-link": "rgba(230,200,200,0.81)",
    "footer-link-hover": "rgba(255,241,241,0.90)",
    "footer-dayoff": "rgba(214,122,122,0.73)",
    "footer-bottom-bg": "rgba(78,35,35,0.87)",
    "footer-bottom": "rgba(188,166,166,0.80)",
    "footer-border": "rgba(146,84,84,0.58)",
    "block-border": "#ffd6d3",
  },
  "#e91e63": {
    primary: "#e91e63",
    "primary-dark": "#ac1746",
    accent: "#ffc1df",
    title: "#5e1432",
    "title-alt": "#ee5490",
    secondary: "#fff2f8",
    bg: "#fff7fb",
    "bg-card": "#fff",
    "side-menu-border": "#e91e63",
    "footer-bg": "rgba(80,40,65,0.88)",
    "footer-title": "rgba(247,230,240,0.93)",
    "footer-text": "rgba(197,177,194,0.78)",
    "footer-link": "rgba(229,198,223,0.82)",
    "footer-link-hover": "rgba(251,234,246,0.92)",
    "footer-dayoff": "rgba(217,141,159,0.73)",
    "footer-bottom-bg": "rgba(58,26,45,0.88)",
    "footer-bottom": "rgba(188,160,180,0.80)",
    "footer-border": "rgba(135,90,119,0.60)",
    "block-border": "rgba(135,90,119,0.38)",
  },
  "#a9744f": {
    primary: "#a9744f",
    "primary-dark": "#845c3e",
    accent: "#ffe6d5",
    title: "#4b352a",
    "title-alt": "#b2876b",
    secondary: "#fff9f5",
    bg: "#fff8f1",
    "bg-card": "#fff",
    "side-menu-border": "#a9744f",
    "footer-bg": "rgba(90,70,57,0.88)",
    "footer-title": "rgba(248,237,229,0.93)",
    "footer-text": "rgba(190,178,167,0.78)",
    "footer-link": "rgba(230,212,194,0.82)",
    "footer-link-hover": "rgba(247,238,233,0.92)",
    "footer-dayoff": "rgba(227,169,154,0.75)",
    "footer-bottom-bg": "rgba(67,55,44,0.88)",
    "footer-bottom": "rgba(186,173,152,0.80)",
    "footer-border": "rgba(141,119,99,0.60)",
    "block-border": "#e9d8c5",
  },
  "#9c27b0": {
    primary: "#9c27b0",
    "primary-dark": "#6a1b7b",
    accent: "#e7bbff",
    title: "#42124b",
    "title-alt": "#bb4dff",
    secondary: "#faf2ff",
    bg: "#fcf7ff",
    "bg-card": "#fff",
    "side-menu-border": "#9c27b0",
    "footer-bg": "rgba(73,57,90,0.89)",
    "footer-title": "rgba(242,238,246,0.93)",
    "footer-text": "rgba(183,176,190,0.79)",
    "footer-link": "rgba(214,203,233,0.82)",
    "footer-link-hover": "rgba(237,234,243,0.92)",
    "footer-dayoff": "rgba(201,167,227,0.77)",
    "footer-bottom-bg": "rgba(50,42,67,0.89)",
    "footer-bottom": "rgba(185,178,203,0.80)",
    "footer-border": "rgba(128,109,148,0.62)",
    "block-border": "#e9e1fc",
  },
  "#00bcd4": {
    primary: "#00bcd4",
    "primary-dark": "#0097a7",
    accent: "#b2ffff",
    title: "#13556a",
    "title-alt": "#13d3e6",
    secondary: "#eafcff",
    bg: "#f4fdff",
    "bg-card": "#fff",
    "side-menu-border": "#00bcd4",
    "footer-bg": "rgba(39,77,85,0.87)",
    "footer-title": "rgba(234,247,250,0.93)",
    "footer-text": "rgba(179,197,200,0.80)",
    "footer-link": "rgba(191,224,232,0.81)",
    "footer-link-hover": "rgba(228,245,250,0.91)",
    "footer-dayoff": "rgba(132,182,191,0.75)",
    "footer-bottom-bg": "rgba(29,54,65,0.88)",
    "footer-bottom": "rgba(152,185,193,0.80)",
    "footer-border": "rgba(85,129,151,0.60)",
    "block-border": "#c1eff4",
  },
};

export const CHAT_SETTINGS_DEFAULT = {
  startTime: "09:00",
  endTime: "18:00",
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  iconPosition: "left",
  color: "#2291ff", // ЧАТ-цвет (НЕ влияет на сайт)
  greeting: "",
};

export const CONTACTS_DEFAULT = {
  phone: "",
  phoneComment: "",
  email: "",
  contactPerson: "",
  address: "",
  phones: [],
  chatSettings: CHAT_SETTINGS_DEFAULT,
};

const LOGO_DEFAULT = null;
const FAVICON_DEFAULT = null;

const SiteContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "https://truck-parts-backend.onrender.com";

/* ===========================
   Утилиты
=========================== */

// Применяем ТОЛЬКО сайт-переменные (никаких --primary)
function applySitePaletteToCSSVars(palette) {
  const root = document.documentElement;
  if (!palette || typeof palette !== "object") return;

  // Базовые
  root.style.setProperty("--site-primary", palette.primary || "#2291ff");
  root.style.setProperty("--site-primary-dark", palette["primary-dark"] || "#1275be");
  root.style.setProperty("--site-accent", palette.accent || "#3fd9d6");
  root.style.setProperty("--site-title", palette.title || "#18446e");
  root.style.setProperty("--site-title-alt", palette["title-alt"] || "#2175f3");
  root.style.setProperty("--site-secondary", palette.secondary || "#f6fafd");
  root.style.setProperty("--site-bg", palette.bg || "#f7fafd");
  root.style.setProperty("--site-bg-card", palette["bg-card"] || "#fff");
  root.style.setProperty("--site-side-menu-border", palette["side-menu-border"] || palette.primary || "#2291ff");
  root.style.setProperty("--site-block-border", palette["block-border"] || "#e3f1ff");

  // Footer
  root.style.setProperty("--site-footer-bg", palette["footer-bg"] || "rgba(33,44,56,0.88)");
  root.style.setProperty("--site-footer-title", palette["footer-title"] || "rgba(245,248,250,0.93)");
  root.style.setProperty("--site-footer-text", palette["footer-text"] || "rgba(179,190,208,0.80)");
  root.style.setProperty("--site-footer-link", palette["footer-link"] || "rgba(194,210,233,0.82)");
  root.style.setProperty("--site-footer-link-hover", palette["footer-link-hover"] || "rgba(228,234,240,0.92)");
  root.style.setProperty("--site-footer-dayoff", palette["footer-dayoff"] || "rgba(230,113,113,0.74)");
  root.style.setProperty("--site-footer-bottom-bg", palette["footer-bottom-bg"] || "rgba(26,34,42,0.89)");
  root.style.setProperty("--site-footer-bottom", palette["footer-bottom"] || "rgba(163,173,185,0.80)");
  root.style.setProperty("--site-footer-border", palette["footer-border"] || "rgba(44,54,65,0.60)");
}

// Мягкая нормализация входящих данных
function mergeDisplay(incoming) {
  const base = { ...DISPLAY_DEFAULT };
  const p = { ...DISPLAY_DEFAULT.palette, ...(incoming?.palette || {}) };
  return { ...base, ...(incoming || {}), palette: p };
}

function mergeContacts(incoming) {
  const base = { ...CONTACTS_DEFAULT };
  const chat = { ...CHAT_SETTINGS_DEFAULT, ...(incoming?.chatSettings || {}) };
  return { ...base, ...(incoming || {}), chatSettings: chat };
}

/* ===========================
   Контекст
=========================== */

export function SiteProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState("");
  const [contacts, setContacts] = useState(CONTACTS_DEFAULT);
  const [display, setDisplay] = useState(DISPLAY_DEFAULT);
  const [siteLogo, setSiteLogo] = useState(LOGO_DEFAULT);
  const [favicon, setFavicon] = useState(FAVICON_DEFAULT);

  // Загрузка с бэка
  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/site-settings`);
      if (!res.ok) throw new Error("Ошибка загрузки настроек");
      const data = await res.json();

      const mergedDisplay = mergeDisplay(data.display);
      const mergedContacts = mergeContacts(data.contacts);

      setSiteName(data.siteName || "Ваше название");
      setContacts(mergedContacts);
      setDisplay(mergedDisplay);
      setSiteLogo(data.siteLogo || null);
      setFavicon(data.favicon || null);

      // Применяем палитру САЙТА сразу
      applySitePaletteToCSSVars(mergedDisplay.palette);
    } catch (err) {
      console.error("Ошибка загрузки настроек:", err);
      setSiteName("SteelTruck");
      setContacts(CONTACTS_DEFAULT);
      setDisplay(DISPLAY_DEFAULT);
      setSiteLogo(LOGO_DEFAULT);
      setFavicon(FAVICON_DEFAULT);

      // Применим дефолтную палитру сайта
      applySitePaletteToCSSVars(DISPLAY_DEFAULT.palette);
    } finally {
      setLoading(false);
    }
  }

  // Сохранение (не смешиваем чат и сайт)
  async function saveSettings({ token, siteName, contacts, display, siteLogo, favicon }) {
    // Мержим аккуратно: чтобы не затереть отсутствующие поля
    const safeDisplay = mergeDisplay(display);
    const safeContacts = mergeContacts(contacts);

    const body = {
      siteName,
      contacts: safeContacts,
      display: safeDisplay,
      siteLogo,
      favicon,
    };

    const res = await fetch(`${API_URL}/api/site-settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[SiteProvider] Ошибка сохранения настроек", res.status);
      throw new Error("Ошибка сохранения настроек");
    }

    const data = await res.json();

    const mergedDisplay = mergeDisplay(data.display);
    const mergedContacts = mergeContacts(data.contacts);

    setSiteName(data.siteName || "SteelTruck");
    setContacts(mergedContacts);
    setDisplay(mergedDisplay);
    setSiteLogo(data.siteLogo || LOGO_DEFAULT);
    setFavicon(data.favicon || FAVICON_DEFAULT);

    // Моментально применяем САЙТ-палитру (чат — отдельно в своём компоненте)
    applySitePaletteToCSSVars(mergedDisplay.palette);
  }

  // При первом монтировании тянем настройки
  useEffect(() => {
    fetchSettings();
  }, []);

  // Если палитра сайта поменялась в рантайме (через setDisplay) — применим
  useEffect(() => {
    if (display?.palette) applySitePaletteToCSSVars(display.palette);
  }, [display?.palette]);

  return (
    <SiteContext.Provider
      value={{
        loading,
        siteName,
        setSiteName,

        contacts,
        setContacts,

        display,
        setDisplay,

        siteLogo,
        setSiteLogo,

        favicon,
        setFavicon,

        fetchSettings,
        saveSettings,

        // Чат — отдельно и не лезет в CSS сайта
        chatSettings: contacts.chatSettings || CHAT_SETTINGS_DEFAULT,
        setChatSettings: (newChatSettings) =>
          setContacts((prev) => ({
            ...prev,
            chatSettings: { ...prev.chatSettings, ...newChatSettings },
          })),
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}

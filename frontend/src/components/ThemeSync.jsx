import { useEffect } from "react";
import { useSite } from "../context/SiteContext";

// Базовые ключи без cart-* (ничего синего здесь не задаём)
const DEFAULTS = {
  primary: "#2291ff",
  "primary-dark": "#1275be",
  secondary: "#f6fafd",
  bg: "#f7fafd",
  "bg-card": "#fff",
  title: "#18446e",
  "title-alt": "#2175f3",
};

export default function ThemeSync() {
  const { display } = useSite();

  useEffect(() => {
    const palette = display?.palette || {};

    // 1) убираем cart-* из палитры (чтобы не залипали старые значения)
    const paletteNoCart = Object.fromEntries(
      Object.entries(palette).filter(([k]) => !k.startsWith("cart-"))
    );

    // 2) базовая палитра
    const base = { ...DEFAULTS, ...paletteNoCart };

    const primary = base.primary || "#2291ff";
    const primaryDark = base["primary-dark"] || "#1275be";
    const secondary = base.secondary || "#f6fafd";
    const bg = base.bg || "#f7fafd";
    const bgCard = base["bg-card"] || "#fff";
    const title = base.title || "#18446e";

    // 3) производные цвета корзины — ЗАВЯЗАНЫ НА primary/primary-dark
    const derivedCart = {
      // общие
      "cart-bg": base["cart-bg"] || bg,
      "cart-section-bg": base["cart-section-bg"] || bgCard,
      "cart-section-shadow": base["cart-section-shadow"] || "#176fc318",
      "cart-section-shadow2": base["cart-section-shadow2"] || "#12569913",
      "cart-section-border": base["cart-section-border"] || "#eaeaea",
      "cart-title": base["cart-title"] || title,

      // основные акценты
      "cart-total-value": primary,
      "cart-btn-outline": primary,
      "cart-btn-outline-hover": primaryDark,
      "cart-btn-order": primary,
      "cart-btn-order-hover": primaryDark,
      "cart-link": primary,
      "cart-link-hover": primaryDark,

      // прочее (нейтральные/не зависящие)
      "cart-btn-clear": base["cart-btn-clear"] || "#dde2e9",
      "cart-price": base["cart-price"] || primaryDark,
      "cart-remove": base["cart-remove"] || "#d04a5d",
      "cart-remove-hover": base["cart-remove-hover"] || "#ff001b",
      "cart-border": base["cart-border"] || "#e2e7f7",
      "cart-label": base["cart-label"] || "#2d3859",
      "cart-meta": base["cart-meta"] || "#8c98ae",
      "cart-recommend-bg": base["cart-recommend-bg"] || secondary,
      "cart-recommend-border": base["cart-recommend-border"] || "#d6e7ff",
      "cart-recommend-shadow": base["cart-recommend-shadow"] || "#2475de13",
      "cart-recommend-shadow-hover":
        base["cart-recommend-shadow-hover"] || "#2175f21a",
      "cart-empty": base["cart-empty"] || "#b7c1d7",
      "cart-recommend-desc": base["cart-recommend-desc"] || "#8ea2c6",
      "cart-recommend-price": base["cart-recommend-price"] || "#799cbf",

      // popover (тоже от primary)
      "cart-popover-bg": base["cart-popover-bg"] || "#fff",
      "cart-popover-color": base["cart-popover-color"] || title,
      "cart-popover-header": base["cart-popover-header"] || primary,
      "cart-popover-title": base["cart-popover-title"] || primary,
      "cart-popover-title-hover":
        base["cart-popover-title-hover"] || primaryDark,
      "cart-popover-total": base["cart-popover-total"] || "#133d80",
      "cart-popover-total-value": primary,
      "cart-popover-btn-outline": primary,
      "cart-popover-btn-outline-hover": primaryDark,
      // фоновые градиенты кнопок в поповере — тоже связаны с primary
      "cart-popover-btn-blue-bg": base["cart-popover-btn-blue-bg"] || primary,
      "cart-popover-btn-blue-hover-bg":
        base["cart-popover-btn-blue-hover-bg"] || primaryDark,
    };

    // 4) финальный набор переменных
    const finalVars = { ...base, ...derivedCart };

    // 5) прокидываем в :root в двух вариантах (и --key, и --color-key)
    Object.entries(finalVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, String(value));
      document.documentElement.style.setProperty(`--color-${key}`, String(value));
    });

    // 6) класс шаблона
    const template = display?.template || "standard";
    const el = document.documentElement;
    el.className = (
      el.className
        .split(" ")
        .filter((c) => !c.startsWith("template-"))
        .join(" ")
        .trim() + " template-" + template
    ).trim();
  }, [display]);

  return null;
}

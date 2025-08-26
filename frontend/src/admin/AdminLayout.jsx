// src/admin/AdminLayout.jsx
import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/AdminPanel.css";

function Icon({ name }) {
  const p = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "support":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 15h.01M12 7v5l3 3" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [dark, setDark] = useState(false);

  const HAS_SUBMENU = /^\/admin\/(orders|products)/.test(location.pathname);

  const SIDE_MENU = [
    { key: "orders", link: "/admin/orders", title: "Заказы" },
    { key: "products", link: "/admin/products", title: "Товары" },
    { key: "clients", link: "/admin/clients", title: "Клиенты" },
    { key: "chat", link: "/admin/chat", title: "Чат" },
    { key: "settings", link: "/admin/settings", title: "Настройки" },
  ];

  const TOP_NAV = [
    { label: "Главная", link: "#" },
    { label: "Маркетинг", link: "#" },
    { label: "Финансы", link: "#" },
    { label: "Справка", link: "#" },
  ];

  const isActive = (href) => location.pathname.startsWith(href);

  return (
    <div className="admin-root admin-layout">
      {/* ===== Верхняя шапка ===== */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <div className="admin-brand">Storo</div>
          <nav className="admin-topbar-nav">
            {TOP_NAV.map((i) => (
              <a key={i.label} href={i.link} className="nav-item">
                {i.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="admin-topbar-right">
          {/* Переключатель темы */}
          <label className="theme-toggle">
            <input
              type="checkbox"
              checked={dark}
              onChange={(e) => setDark(e.target.checked)}
            />
            <span className="slider"></span>
            <span className="theme-label">Темная тема</span>
          </label>

          {/* Техподдержка */}
          <button className="support-btn" title="Техподдержка">
            <Icon name="support" />
            <span>Техподдержка</span>
          </button>

          {/* Тариф */}
          <div className="tariff-chip">Ваш тариф: <b>Free</b></div>

          {/* Посетители */}
          <div className="visitors-chip">
            Посетителей на сайте: <b>0</b>
          </div>

          {/* Профиль */}
          <div className="profile-mini" title={user?.email || "Профиль"}>
            <div className="avatar-mini">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="meta">
              <div className="name">{user?.name || "Админ"}</div>
              <div className="role">Administrator</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Левое меню ===== */}
      <aside className="admin-sidebar">
        <nav className="admin-menu">
          {SIDE_MENU.map((item) => (
            <Link
              key={item.key}
              to={item.link}
              className={isActive(item.link) ? "active" : ""}
              title={item.title}
            >
              {item.title[0]}
            </Link>
          ))}
        </nav>
        <div className="admin-footer" style={{ marginTop: "auto" }}>
          <a className="go-to-site" href="/" target="_blank" rel="noreferrer">
            <Icon name="globe" />
          </a>
        </div>
      </aside>

      {/* ===== Контент ===== */}
      <main className={`admin-content ${HAS_SUBMENU ? "with-submenu" : ""}`}>
        <Outlet />
      </main>
    </div>
  );
}

// src/admin/AdminLayout.jsx
import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/AdminPanel.css";

/* Небольшие inline-SVG иконки */
function Icon({ name }) {
  const p = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (name) {
    case "orders":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M3 8h18M8 12h8" />
        </svg>
      );
    case "products":
      return (
        <svg {...p}>
          <path d="M12 2l8 4-8 4-8-4 8-4z" />
          <path d="M4 10l8 4 8-4" />
          <path d="M4 14l8 4 8-4" />
        </svg>
      );
    case "clients":
      return (
        <svg {...p}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "chat":
      return (
        <svg {...p}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 8h8M8 12h5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a7.97 7.97 0 0 1-1.4 1.4l1.1 2.4-2 2-2.4-1.1a7.97 7.97 0 0 1-1.4 1.4L12 22l-1.3-2.9a7.97 7.97 0 0 1-1.4-1.4L6.9 20l-2-2 1.1-2.4a7.97 7.97 0 0 1-1.4-1.4L2 12l2.9-1.3a7.97 7.97 0 0 1 1.4-1.4L5.6 6.9l2-2 2.4 1.1a7.97 7.97 0 0 1 1.4-1.4L12 2l1.3 2.9a7.97 7.97 0 0 1 1.4 1.4L17.1 4.9l2 2-1.1 2.4a7.97 7.97 0 0 1 1.4 1.4L22 12z" />
        </svg>
      );
    case "globe": // иконка планеты
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
  const [darkMode, setDarkMode] = useState(false);

  // Маршруты, где справа используется подменю (.admin-nav-menu)
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
      {/* ===== Верхняя шапка (фикс) ===== */}
      <header className="admin-topbar" role="banner">
        <div className="admin-topbar-left">
          <div className="admin-brand">Storo</div>
          <nav className="admin-topbar-nav" aria-label="Основная навигация">
            {TOP_NAV.map((i) => (
              <a key={i.label} href={i.link} className="nav-item">
                {i.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="admin-topbar-right">
          {/* Новый блок: тариф и переключатель */}
          <div className="tariff-info">Ваш тариф: <b>Free</b></div>

          <label className="theme-switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
            <span className="slider" />
            <span className="theme-label">Тёмная тема</span>
          </label>

          <div className="visitors-chip" aria-live="polite">
            Посетителей на сайте: <b>0</b>
          </div>

          <div
            className="profile-mini"
            title={user?.email || "Профиль"}
            role="button"
            tabIndex={0}
          >
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

      {/* ===== Левый сайдбар (фикс) ===== */}
      <aside className="admin-sidebar" aria-label="Меню разделов">
        <nav className="admin-menu">
          {SIDE_MENU.map((item) => (
            <Link
              key={item.key}
              to={item.link}
              className={isActive(item.link) ? "active" : ""}
              title={item.title}
              aria-label={item.title}
            >
              <div className="admin-menu-icon-svg">
                <Icon name={item.key} />
              </div>
            </Link>
          ))}
        </nav>

        {/* Нижняя кнопка "Перейти на сайт" */}
        <div className="admin-footer" style={{ marginTop: "auto" }}>
          <a
            className="go-to-site"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Перейти на сайт"
            aria-label="Перейти на сайт"
          >
            <div className="admin-menu-icon-svg">
              <Icon name="globe" />
            </div>
          </a>
        </div>
      </aside>

      {/* ===== Контент ===== */}
      <main
        className={`admin-content ${HAS_SUBMENU ? "with-submenu" : ""}`}
        role="main"
      >
        <Outlet />
      </main>
    </div>
  );
}

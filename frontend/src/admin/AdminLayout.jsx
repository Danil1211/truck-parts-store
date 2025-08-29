// src/admin/AdminLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import "../assets/AdminPanel.css";

/* Лоадер */
function LoaderScreen() {
  return (
    <div className="admin-loader-full">
      <div className="loader"></div>
    </div>
  );
}

/* Иконки */
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
  };
  switch (name) {
    case "orders":
      return (
        <svg {...p}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
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
          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 0 0 1.065 2.572c1.757.427 1.757 2.924 0 3.35a1.724 1.724 0 0 0-1.065 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 0 0-2.573 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 0 0-2.572-1.065c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 0 0-1.066-2.573c-1.756-.426-1.756-2.923 0-3.35a1.724 1.724 0 0 0 1.066-2.572c-.89-1.543.877-3.31 2.42-2.42.997.575 2.275.126 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
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
  const [loading, setLoading] = useState(true);

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

  // имитация инициализации (напр. /api/settings)
  useEffect(() => {
    (async () => {
      try {
        await api.get("/api/settings");
      } catch (e) {
        console.error("init error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoaderScreen />;

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
          <label className="theme-switch">
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
          <div className="tariff-chip">
            Ваш тариф: <b>Free</b>
          </div>

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
              <div className="admin-menu-icon-svg">
                <Icon name={item.key} />
              </div>
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

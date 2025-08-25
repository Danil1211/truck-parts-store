import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/AdminPanel.css";

/* Стабильные inline-SVG */
function Icon({ name }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "orders":   return <svg {...p}><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18M8 12h8"/></svg>;
    case "products": return <svg {...p}><path d="M12 2l8 4-8 4-8-4 8-4z"/><path d="M4 10l8 4 8-4"/><path d="M4 14l8 4 8-4"/></svg>;
    case "clients":  return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "chat":     return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 8h8M8 12h5"/></svg>;
    case "settings": return <svg {...p}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82l.02.06a2 2 0 1 1-3.78 0l.02-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.9 17l.06-.06A1.65 1.65 0 0 0 3.6 15"/></svg>;
    default: return null;
  }
}

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const SIDE_MENU = [
    { key: "orders",   link: "/admin/orders",   title: "Заказы" },
    { key: "products", link: "/admin/products", title: "Товары" },
    { key: "clients",  link: "/admin/clients",  title: "Клиенты" },
    { key: "chat",     link: "/admin/chat",     title: "Чат" },
    { key: "settings", link: "/admin/settings", title: "Настройки" },
  ];

  const TOP_NAV = [
    { label: "Главная",   link: "#" },
    { label: "Маркетинг", link: "#" },
    { label: "Финансы",   link: "#" },
    { label: "Справка",   link: "#" },
  ];

  const isActive = (href) => location.pathname.startsWith(href);

  return (
    <div className="admin-root admin-layout">
      {/* верхнее меню (эпл-стиль) */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <div className="admin-brand">Storo</div>
          <nav className="admin-topbar-nav">
            {TOP_NAV.map((i) => (
              <a key={i.label} href={i.link} className="nav-item">{i.label}</a>
            ))}
          </nav>
        </div>
        <div className="admin-topbar-right">
          <div className="visitors-chip">Посетителей на сайте: <b>0</b></div>
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
      </div>

      {/* левый сайдбар (без профиля!) */}
      <aside className="admin-sidebar">
        <nav className="admin-menu">
          {SIDE_MENU.map((item) => (
            <Link key={item.key} to={item.link} className={isActive(item.link) ? "active" : ""} title={item.title}>
              <div className="admin-menu-icon-svg"><Icon name={item.key} /></div>
            </Link>
          ))}
        </nav>
        <div className="admin-footer">
          <a className="go-to-site" href="/" target="_blank" rel="noopener noreferrer" title="Перейти на сайт">
            <div className="admin-menu-icon-svg"><Icon name="products" /></div>
          </a>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

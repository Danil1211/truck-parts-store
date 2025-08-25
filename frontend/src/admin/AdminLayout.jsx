// src/admin/AdminLayout.jsx
import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminNotify } from "../context/AdminNotifyContext";
import "../assets/AdminPanel.css";

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const { totalUnread, totalNewOrders } = useAdminNotify();

  const MENU = [
    { key: "orders",   link: "/admin/orders",   title: "Заказы",   badge: totalNewOrders },
    { key: "products", link: "/admin/products", title: "Товары" },
    { key: "clients",  link: "/admin/clients",  title: "Клиенты" },
    { key: "chat",     link: "/admin/chat",     title: "Чат",      badge: totalUnread },
    { key: "analytics",link: "/admin/analytics",title: "Аналитика" },
    { key: "settings", link: "/admin/settings", title: "Настройки" },
  ];

  return (
    <div className="admin-root admin-layout">
      {/* 🔹 Верхнее горизонтальное меню */}
      <div className="admin-topbar">
        {MENU.map((item) => {
          const active = location.pathname.includes(item.key);
          return (
            <Link
              key={item.key}
              to={item.link}
              className={active ? "active" : ""}
            >
              {item.title}
              {item.badge ? (
                <span className="topbar-badge">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* 🔹 Боковое вертикальное меню */}
      <aside className="admin-sidebar">
        <div className="admin-profile">
          <div className="admin-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div className="admin-name">{user?.name || "Админ"}</div>
        </div>

        <nav className="admin-menu">
          {MENU.map((item) => {
            const active = location.pathname.includes(item.key);
            return (
              <div key={item.key} style={{ position: "relative" }}>
                <Link to={item.link} className={active ? "active" : ""} title={item.title}>
                  <img
                    src={`/images/${item.title}.png`}
                    alt={item.title}
                    className="admin-menu-icon"
                  />
                </Link>
                {item.badge ? (
                  <span className="notification-badge">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="admin-footer">
          <a
            className="go-to-site"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Перейти на сайт"
          >
            <img
              src="/images/Перейти.png"
              alt="Перейти на сайт"
              className="admin-menu-icon"
            />
          </a>
        </div>
      </aside>

      {/* 🔹 Контент */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

// src/admin/AdminLayout.jsx
import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminNotify } from "../context/AdminNotifyContext";
import "../assets/AdminPanel.css";

export default function AdminLayout() {
  const { user, login, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { totalUnread, totalNewOrders } = useAdminNotify();
  const [ready, setReady] = useState(false);

  // 1) Подхватываем ?token=&tid= при первом заходе из лендинга
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("token");
    const tid = params.get("tid");

    if (t) {
      login(t, { tenantId: tid });
      params.delete("token");
      params.delete("tid");
      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params}` : "",
        },
        { replace: true }
      );
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Жёсткая проверка прав
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/admin/login", { replace: true });
      return;
    }

    const isAdmin =
      ["owner", "admin"].includes(user.role) || user.isAdmin === true;
    if (!isAdmin) {
      logout();
      navigate("/", { replace: true });
    }
  }, [ready, user, navigate, logout]);

  if (!ready) return null;

  const MENU = [
    {
      key: "orders",
      link: "/admin/orders",
      icon: "/images/Заказы.png",
      title: "Заказы",
      badge: totalNewOrders,
    },
    {
      key: "products",
      link: "/admin/products",
      icon: "/images/Товары.png",
      title: "Товары",
    },
    {
      key: "chat",
      link: "/admin/chat",
      icon: "/images/Чаты.png",
      title: "Чат",
      badge: totalUnread,
    },
    {
      key: "clients",
      link: "/admin/clients",
      icon: "/images/Клиенты.png",
      title: "Клиенты",
    },
    {
      key: "analytics",
      link: "/admin/analytics",
      icon: "/images/Аналитика.png",
      title: "Аналитика",
    },
    {
      key: "settings",
      link: "/admin/settings",
      icon: "/images/Настройки.png",
      title: "Настройки",
    },
  ];

  return (
    <div className="admin-root admin-layout">
      <aside className="admin-sidebar">
        {/* профиль админа */}
        <div className="admin-profile">
          <div className="admin-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div className="admin-name">{user?.name || "Админ"}</div>
        </div>

        {/* вертикальное меню */}
        <nav className="admin-menu">
          {MENU.map((item) => {
            const active = location.pathname.includes(item.key);
            return (
              <div key={item.key} style={{ position: "relative" }}>
                <Link
                  to={item.link}
                  className={active ? "active" : ""}
                  title={item.title}
                >
                  <img
                    src={item.icon}
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

        {/* футер меню */}
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

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

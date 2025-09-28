import React from "react";
import { useLocation, Link } from "react-router-dom";
import "../assets/AdminPanel.css";

const MENUS = {
  products: [
    { key: "list",   label: "Товары",  link: "/admin/products" },
    { key: "groups", label: "Группы",  link: "/admin/groups"   },
  ],
  orders: [
    { key: "all",        label: "Все заказы",   link: "/admin/orders?status=all" },
    { key: "new",        label: "Новые",        link: "/admin/orders?status=new" },
    { key: "processing", label: "В обработке",  link: "/admin/orders?status=processing" },
    { key: "done",       label: "Выполнены",    link: "/admin/orders?status=done" },
    { key: "cancelled",  label: "Отменённые",   link: "/admin/orders?status=cancelled" },
  ],
  settings: [
    { key: "main",    label: "Основные настройки", link: "/admin/settings?tab=main" },
    { key: "site",    label: "Управление сайтом",  link: "/admin/settings?tab=site" },
    { key: "chat",    label: "Настройки чата",     link: "/admin/settings/chat" }, /* ← обновлено */
    { key: "banners", label: "Баннеры",            link: "/admin/settings?tab=banners" },
  ],
  clients: [
    { key: "registered", label: "Зарегистрированные", link: "/admin/clients?tab=registered" },
    { key: "guests",     label: "Без регистрации",    link: "/admin/clients?tab=guests" },
  ],
  market: [
    { key: "layout",  label: "Лейаут",       link: "/admin/market/layout" },
    { key: "design",  label: "Дизайн сайта", link: "/admin/market/design" },
    { key: "apps",    label: "Приложения",   link: "/admin/market/apps" },
  ],
};

export default function AdminSubMenu({ type = "products", style = {}, title }) {
  const location = useLocation();
  const menu = MENUS[type] || [];
  const defaultTitle =
    type === "orders"   ? "Управление заказами" :
    type === "products" ? "Управление товарами" :
    type === "market"   ? "Маркет" :
    "Управление клиентами";

  return (
    <aside className="admin-nav-menu" style={style}>
      <div className="admin-nav-title">{title || defaultTitle}</div>
      {menu.map((item) => (
        <Link
          key={item.key}
          to={item.link}
          className={
            (location.pathname + location.search) === item.link ||
            location.pathname.startsWith(item.link)
              ? "admin-nav-link active"
              : "admin-nav-link"
          }
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}

import React from "react";
import { useLocation, Link } from "react-router-dom";
import "../assets/AdminPanel.css";

const MENUS = {
  products: [
    { key: "list", label: "Позиции", link: "/admin/products" },
    { key: "groups", label: "Группы / Подгруппы", link: "/admin/groups" },
    { key: "import", label: "Импорт", link: "/admin/import" },
    { key: "promos", label: "Акции и промокоды", link: "/admin/promos" },
    { key: "deleted", label: "Удалённые позиции", link: "/admin/deleted" },
    { key: "restore", label: "Восстановление позиций", link: "/admin/restore" },
    { key: "features", label: "Характеристики", link: "/admin/features" },
  ],
  orders: [
    { key: "all", label: "Все заказы", filter: "all" },
    { key: "new", label: "Новые", filter: "new" },
    { key: "processing", label: "В обработке", filter: "processing" },
    { key: "done", label: "Выполнены", filter: "done" },
    { key: "cancelled", label: "Отменённые", filter: "cancelled" },
  ],
  settings: [
    { key: "main", label: "Основные настройки" },
    { key: "site", label: "Управление сайтом" },
    { key: "delivery", label: "Способы доставки" },
    { key: "payment", label: "Способы оплаты" },
    { key: "schedule", label: "График работы" },
    { key: "return", label: "Возврат и гарантия" },
    { key: "managers", label: "Менеджеры" },
  ]
};

// props: type = "products" | "orders" | "settings"
export default function AdminSubMenu({
  type = "products",
  activeKey,
  onSelect,
  style = {},
  title,
}) {
  const location = useLocation();
  const menu = MENUS[type] || [];

  return (
    <aside className="admin-nav-menu" style={style}>
      {/* Заголовок меню */}
      <div
        className="admin-nav-title"
        style={{
          fontWeight: 400,
          fontSize: 17,
          color: "#117fff",
          margin: "0 0 8px 18px",
          letterSpacing: 0.2
        }}
      >
        {title || "Управление товарами"}
      </div>

      {menu.map(item =>
        item.link ? (
          <Link
            key={item.key}
            to={item.link}
            className={
              location.pathname === item.link
                ? "admin-nav-link active"
                : "admin-nav-link"
            }
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.key}
            className={
              activeKey === item.key
                ? "admin-nav-link active"
                : "admin-nav-link"
            }
            onClick={() => onSelect && onSelect(item.key)}
            type="button"
          >
            {item.label}
          </button>
        )
      )}
    </aside>
  );
}

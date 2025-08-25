import React from "react";
import { useLocation, Link } from "react-router-dom";
import "../assets/AdminPanel.css";

const MENUS = {
  products: [
    { key: "list",   label: "Позиции",              link: "/admin/products" },
    { key: "groups", label: "Группы / Подгруппы",   link: "/admin/groups"   },
  ],
  orders: [
    { key: "all",        label: "Все заказы",   filter: "all"        },
    { key: "new",        label: "Новые",        filter: "new"        },
    { key: "processing", label: "В обработке",  filter: "processing" },
    { key: "done",       label: "Выполнены",    filter: "done"       },
    { key: "cancelled",  label: "Отменённые",   filter: "cancelled"  },
  ],
  settings: [
    { key: "main", label: "Основные настройки" },
    { key: "site", label: "Управление сайтом"  },
  ],
};

export default function AdminSubMenu({
  type = "products",
  activeKey,
  onSelect,
  style = {},
  title,
}) {
  const location = useLocation();
  const menu = MENUS[type] || [];
  const defaultTitle =
    type === "orders"   ? "Управление заказами" :
    type === "products" ? "Управление товарами" :
    "Меню";

  return (
    <aside className="admin-nav-menu" style={style}>
      <div className="admin-nav-title">{title || defaultTitle}</div>

      {menu.map((item) =>
        item.link ? (
          <Link
            key={item.key}
            to={item.link}
            className={
              location.pathname.startsWith(item.link)
                ? "admin-nav-link active"
                : "admin-nav-link"
            }
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            className={
              activeKey === (item.filter || item.key)
                ? "admin-nav-link active"
                : "admin-nav-link"
            }
            onClick={() => onSelect && onSelect(item.filter || item.key)}
          >
            {item.label}
          </button>
        )
      )}
    </aside>
  );
}

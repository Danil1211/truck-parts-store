import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../assets/NavMenu.css";

const API_URL = import.meta.env.VITE_API_URL || "";

function isInternal(url = "") {
  return url && !/^https?:\/\//i.test(url);
}

export default function NavMenu() {
  const location = useLocation();
  const [items, setItems] = useState([]);

  // грузим настройки сайта (только меню)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/site-settings`);
        const json = await r.json();
        if (ignore) return;
        const horizontal = Array.isArray(json?.horizontalMenu) ? json.horizontalMenu : [];
        // сортировка по order, фильтр по visible
        const normalized = horizontal
          .filter((i) => i && i.visible !== false) // по умолчанию true
          .map((i) => ({
            title: (i.title || "").trim(),
            url: (i.url || "/").trim(),
            order: Number.isFinite(+i.order) ? +i.order : 0,
          }))
          .sort((a, b) => a.order - b.order);
        setItems(normalized);
      } catch (e) {
        console.error("Failed to load horizontal menu:", e);
        setItems([]);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // активный пункт
  const activePath = location.pathname + location.search;
  const isActive = (url) => {
    if (!url) return false;
    // точное совпадение для корня, startsWith для разделов
    if (url === "/") return location.pathname === "/";
    return activePath.startsWith(url);
  };

  const visibleItems = useMemo(() => items.filter(i => i.title && i.url), [items]);

  if (visibleItems.length === 0) {
    // ничего не показываем, если админка ещё не настроила
    return null;
  }

  return (
    <nav className="nav-menu-modern">
      <ul>
        {visibleItems.map((it, idx) => {
          const internal = isInternal(it.url);
          const className = isActive(it.url) ? "active" : "";
          return (
            <li key={it.title + idx}>
              {internal ? (
                <Link to={it.url} className={className}>
                  {it.title}
                </Link>
              ) : (
                <a href={it.url} className={className} target="_blank" rel="noopener noreferrer">
                  {it.title}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

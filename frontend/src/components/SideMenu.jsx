import React, { useEffect, useMemo, useState } from "react";
import "../assets/SideMenu.css";
import { useSite } from "../context/SiteContext";

const API_URL = import.meta.env.VITE_API_URL || "";

function isInternal(url = "") {
  return url && !/^https?:\/\//i.test(url);
}

export default function SideMenu() {
  // контакты остаются из контекста, как было
  const { contacts } = useSite();
  const phones = Array.isArray(contacts?.phones) ? contacts.phones : [];
  const email = contacts?.email || "";
  const contactPerson = contacts?.contactPerson || "";
  const address = contacts?.address || "";

  const [items, setItems] = useState([]);

  // тянем вертикальное меню из настроек
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/site-settings`);
        const json = await r.json();
        if (ignore) return;
        const vertical = Array.isArray(json?.verticalMenu) ? json.verticalMenu : [];
        const normalized = vertical
          .filter((i) => i && i.visible !== false)
          .map((i) => ({
            title: (i.title || "").trim(),
            url: (i.url || "/").trim(),
            order: Number.isFinite(+i.order) ? +i.order : 0,
          }))
          .sort((a, b) => a.order - b.order);
        setItems(normalized);
      } catch (e) {
        console.error("Failed to load vertical menu:", e);
        setItems([]);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const visibleItems = useMemo(() => items.filter(i => i.title && i.url), [items]);

  return (
    <aside className="side-menu-modern">
      {/* Заголовок */}
      <div className="side-menu-title-new">
        <svg className="side-menu-title-icon" width="25" height="25" viewBox="0 0 25 25" fill="none">
          <rect x="4" y="7" width="17" height="2.3" rx="1.15" fill="currentColor"/>
          <rect x="4" y="12" width="17" height="2.3" rx="1.15" fill="currentColor"/>
          <rect x="4" y="17" width="17" height="2.3" rx="1.15" fill="currentColor"/>
        </svg>
        <span>Каталог</span>
      </div>

      {/* Категории из админки (если пусто — блок не рисуем) */}
      {visibleItems.length > 0 && (
        <nav>
          <ul className="side-menu-modern-list">
            {visibleItems.map((cat, idx) => {
              const internal = isInternal(cat.url);
              return (
                <li key={cat.title + idx}>
                  {internal ? (
                    <a href={cat.url}>
                      <span>{cat.title}</span>
                      <span className="side-menu-arrow">›</span>
                    </a>
                  ) : (
                    <a href={cat.url} target="_blank" rel="noopener noreferrer">
                      <span>{cat.title}</span>
                      <span className="side-menu-arrow">↗</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Карточки — График работы и Контакты */}
      <div className="side-menu-sticky-cards">
        <div className="side-menu-modern-card">
          <div className="side-menu-modern-card-title">График работы</div>
          <div className="side-menu-modern-card-text">
            Пн–Пт: 9:00 – 18:00<br />
            Сб: 10:00 – 15:00<br />
            Вс: <span className="day-off">выходной</span>
          </div>
        </div>
        <div className="side-menu-modern-card">
          <div className="side-menu-modern-card-title">Контакты</div>
          <div className="side-menu-modern-card-text contacts-block">
            {/* Телефоны */}
            <div className="contact-field">
              <div className="contact-label">Телефон:</div>
              <div>
                {phones.length > 0 ? (
                  phones.map((item, idx) =>
                    item.phone ? (
                      <div key={idx} className="contact-phone-row">
                        <span>{item.phone}</span>
                        {item.comment && (
                          <span className="phone-comment"> ({item.comment})</span>
                        )}
                      </div>
                    ) : null
                  )
                ) : (
                  <span style={{ color: '#aaa' }}>—</span>
                )}
              </div>
            </div>
            {/* Email */}
            <div className="contact-field">
              <div className="contact-label">Email:</div>
              <div>{email ? <span>{email}</span> : <span style={{ color: '#aaa' }}>—</span>}</div>
            </div>
            {/* Контактное лицо */}
            <div className="contact-field">
              <div className="contact-label">Контактное лицо:</div>
              <div>{contactPerson || <span style={{ color: '#aaa' }}>—</span>}</div>
            </div>
            {/* Адрес */}
            <div className="contact-field">
              <div className="contact-label">Адрес:</div>
              <div>{address || <span style={{ color: '#aaa' }}>—</span>}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Соц. сети */}
      <div className="side-menu-socials">
        <span className="side-menu-socials-title">Соц. сети</span>
        <div className="side-menu-socials-list">
          <a href="https://wa.me/79999999999" target="_blank" rel="noopener" aria-label="WhatsApp">
            <img src="/images/w-icon.png" alt="WhatsApp" />
          </a>
          <a href="viber://chat?number=%2B71234567890" target="_blank" rel="noopener" aria-label="Viber">
            <img src="/images/v-icon.png" alt="Viber" />
          </a>
          <a href="https://instagram.com/username" target="_blank" rel="noopener" aria-label="Instagram">
            <img src="/images/i-icon.png" alt="Instagram" />
          </a>
          <a href="https://t.me/username" target="_blank" rel="noopener" aria-label="Telegram">
            <img src="/images/t-icon.png" alt="Telegram" />
          </a>
          <a href="https://facebook.com/username" target="_blank" rel="noopener" aria-label="Facebook">
            <img src="/images/f-icon.png" alt="Facebook" />
          </a>
        </div>
      </div>
    </aside>
  );
}

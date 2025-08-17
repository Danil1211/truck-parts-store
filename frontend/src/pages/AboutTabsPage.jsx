// src/pages/AboutTabsPage.jsx
import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import SideMenu from "../components/SideMenu";
import Header from "../components/Header";
import NavMenu from "../components/NavMenu";
import Footer from "../components/Footer";
import "../assets/AboutTabsPage.css";
import { useSite } from "../context/SiteContext";

const TABS = [
  { key: "about", label: "О компании" },
  { key: "contacts", label: "Контакты" },
  { key: "delivery", label: "Доставка и оплата" },
  { key: "return", label: "Возврат" },
];

function useQueryTab() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const current = params.get("tab") || "about";

  const setTab = (key) => {
    const next = new URLSearchParams(location.search);
    next.set("tab", key);
    navigate({ search: next.toString() }, { replace: false });
  };

  return [current, setTab];
}

export default function AboutTabsPage() {
  const { contacts } = useSite();
  const [tab, setTab] = useQueryTab();

  const safeContacts = contacts || {};
  const phones = Array.isArray(safeContacts.phones) ? safeContacts.phones : [];

  const content = useMemo(() => {
    switch (tab) {
      case "contacts":
        return (
          <>
            <h2>Контакты</h2>
            <ul className="contacts-list-page">
              {/* Телефоны */}
              {phones.length > 0 && phones.some((p) => p?.phone) && (
                <li>
                  <b>Телефон:</b>
                  <div style={{ display: "flex", flexDirection: "column", marginTop: 2, gap: 2 }}>
                    {phones
                      .filter((p) => p?.phone)
                      .map((p, idx) => (
                        <span key={idx}>
                          {p.phone}
                          {p.comment ? ` (${p.comment})` : ""}
                        </span>
                      ))}
                  </div>
                </li>
              )}

              {/* Email */}
              {safeContacts.email ? (
                <li>
                  <b>Email:</b> <span>{safeContacts.email}</span>
                </li>
              ) : null}

              {/* Контактное лицо */}
              {safeContacts.contactPerson ? (
                <li>
                  <b>Контактное лицо:</b> <span>{safeContacts.contactPerson}</span>
                </li>
              ) : null}

              {/* Адрес */}
              {safeContacts.address ? (
                <li>
                  <b>Адрес:</b> <span>{safeContacts.address}</span>
                </li>
              ) : null}
            </ul>
          </>
        );

      case "delivery":
        return (
          <>
            <h2>Доставка и оплата</h2>
            <p>Мы отправляем заказы по всей Украине с помощью Новой Почты или другой транспортной компании по вашему выбору.</p>
            <ul>
              <li>Оплата при получении (наложенный платеж)</li>
              <li>Безналичный расчет</li>
              <li>Карта ПриватБанка</li>
            </ul>
            <p>Подробности по телефону или у менеджера при оформлении заказа.</p>
          </>
        );

      case "return":
        return (
          <>
            <h2>Политика возврата</h2>
            <p>
              Возврат и обмен товара возможен в течение 14 дней после покупки, если товар не был в эксплуатации и сохранил товарный вид.
            </p>
            <ul>
              <li>Сохраните чек и упаковку</li>
              <li>Свяжитесь с менеджером для согласования возврата</li>
            </ul>
            <p>
              Подробные условия — по <b>телефону поддержки</b>.
            </p>
          </>
        );

      case "about":
      default:
        return (
          <>
            <h2>О компании</h2>
            <p>
              TruckParts — интернет-магазин автозапчастей с опытом работы более 10 лет. Мы предлагаем только оригинальные детали для грузовых автомобилей с доставкой по всей Украине.
            </p>
            <ul>
              <li>Огромный ассортимент запчастей</li>
              <li>Собственный склад и быстрая отправка</li>
              <li>Консультация опытных специалистов</li>
            </ul>
          </>
        );
    }
  }, [tab, phones, safeContacts]);

  return (
    <>
      <div className="main-container">
        <Header />
        <NavMenu />
        <div style={{ display: "flex", alignItems: "flex-start", width: "100%", marginTop: 16, gap: 24 }}>
          <div style={{ minWidth: 210 }}>
            <SideMenu />
          </div>

          <div style={{ flex: 1 }}>
            <section className="about-tabs-section">
              <div className="about-tabs-container">
                {/* Навигация по вкладкам */}
                <div className="about-tabs-nav">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      className={`about-tab-btn${tab === t.key ? " active" : ""}`}
                      onClick={() => setTab(t.key)}
                      type="button"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Контент вкладки */}
                <div className="about-tabs-content">{content}</div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

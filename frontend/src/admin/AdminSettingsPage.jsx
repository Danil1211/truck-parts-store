// src/admin/AdminSettingsPage.jsx
import React, { useRef, useState, useEffect, useMemo } from "react";
import "../assets/AdminSettingsPage.css";
import { useSite } from "../context/SiteContext";
import { DISPLAY_DEFAULT, PALETTES } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "";

// Формируем корректный URL к картинке (абсолютный если надо)
const imgURL = (u) => {
  if (!u) return "/noimg.png";
  return /^https?:\/\//i.test(u) ? u : `${API_URL}${u}`;
};

const WEEK_DAYS = [
  { key: "mon", label: "Пн" },
  { key: "tue", label: "Вт" },
  { key: "wed", label: "Ср" },
  { key: "thu", label: "Чт" },
  { key: "fri", label: "Пт" },
  { key: "sat", label: "Сб" },
  { key: "sun", label: "Вс" },
];

const COLOR_PALETTE = [
  "#2291ff",
  "#4caf50",
  "#ff9800",
  "#f44336",
  "#e91e63",
  "#a9744f",
  "#9c27b0",
  "#00bcd4",
];

const SETTINGS_MENU = [
  { key: "main", title: "Основные настройки" },
  { key: "site", title: "Управление сайтом" },
  { key: "delivery", title: "Способы доставки" },
  { key: "payment", title: "Способы оплаты" },
  { key: "schedule", title: "График работы" },
  { key: "return", title: "Возврат и гарантия" },
  { key: "managers", title: "Менеджеры" },
];

// Подбираем корректную палитру (с футер-цветами) под выбранный основной цвет сайта
function getPaletteWithFooter(selectedColor) {
  const base =
    PALETTES[selectedColor] || {
      ...DISPLAY_DEFAULT.palette,
      primary: selectedColor,
      "footer-bg": "#232a34",
    };
  return {
    ...base,
    "side-menu-border": selectedColor,
  };
}

// хелперы для меню
const newMenuItem = (order = 0) => ({
  _id: crypto.randomUUID(),
  title: "",
  url: "/",
  visible: true,
  order,
});
const sanitizeMenuArray = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((it, idx) => ({
      _id: it._id || crypto.randomUUID(),
      title: (it.title || "").trim(),
      url: (it.url || "/").trim(),
      visible: !!it.visible,
      order: Number.isFinite(+it.order) ? +it.order : idx,
    }))
    .sort((a, b) => a.order - b.order);

export default function AdminSettingsPage() {
  const {
    siteName,
    setSiteName,
    contacts,
    setContacts,
    display,
    setDisplay,
    siteLogo,
    setSiteLogo,
    favicon,
    setFavicon,
    saveSettings,
  } = useSite();

  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const [tab, setTab] = useState("main");

  // ========= MAIN (как было) =========
  // Контакты
  const [email, setEmail] = useState(contacts?.email || "");
  const [contactPerson, setContactPerson] = useState(contacts?.contactPerson || "");
  const [address, setAddress] = useState(contacts?.address || "");
  const [phones, setPhones] = useState(
    contacts?.phones && contacts.phones.length ? contacts.phones : [{ phone: "", comment: "" }]
  );

  // Логотип/фавикон
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(siteLogo || null);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef();

  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(favicon || null);
  const faviconInputRef = useRef();

  // Чат
  const defaultChatSettings = contacts?.chatSettings || {};
  const [chatStartTime, setChatStartTime] = useState(defaultChatSettings.startTime || "09:00");
  const [chatEndTime, setChatEndTime] = useState(defaultChatSettings.endTime || "18:00");
  const [chatWorkDays, setChatWorkDays] = useState(
    defaultChatSettings.workDays || WEEK_DAYS.map((d) => d.key)
  );
  const [chatIconPosition, setChatIconPosition] = useState(defaultChatSettings.iconPosition || "left");
  const [chatColor, setChatColor] = useState(defaultChatSettings.color || "#2291ff");
  const [chatGreeting, setChatGreeting] = useState(defaultChatSettings.greeting || "");

  // UI сообщения
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Текущий основной цвет САЙТА (для UI выделения кружка)
  const sitePalettePrimary = display?.palette?.primary || COLOR_PALETTE[0];

  // Синк при входящих изменениях из контекста (после загрузки/сохранения)
  useEffect(() => {
    setEmail(contacts?.email || "");
    setContactPerson(contacts?.contactPerson || "");
    setAddress(contacts?.address || "");
    setPhones(
      contacts?.phones && contacts.phones.length ? contacts.phones : [{ phone: "", comment: "" }]
    );
    setLogoPreview(siteLogo || null);

    if (contacts?.chatSettings) {
      setChatStartTime(contacts.chatSettings.startTime || "09:00");
      setChatEndTime(contacts.chatSettings.endTime || "18:00");
      setChatWorkDays(contacts.chatSettings.workDays || WEEK_DAYS.map((d) => d.key));
      setChatIconPosition(contacts.chatSettings.iconPosition || "left");
      setChatColor(contacts.chatSettings.color || "#2291ff");
      setChatGreeting(contacts.chatSettings.greeting || "");
    }
  }, [contacts, siteLogo]);

  // Выбор цвета САЙТА — меняем только display.palette
  function handleSitePaletteSelect(color) {
    const palette = getPaletteWithFooter(color);
    setDisplay((prev) => ({
      ...prev,
      palette,
    }));
  }

  // Выбор цвета ЧАТА — меняем только локальный стейт chatColor
  function handleChatColorSelect(color) {
    setChatColor(color);
  }

  // Сохранение MAIN
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSaveMessage("");

    try {
      const normalizedSitePalette = getPaletteWithFooter(sitePalettePrimary);

      const dataToSave = {
        token,
        siteName,
        contacts: {
          ...contacts,
          email,
          contactPerson,
          address,
          phones,
          chatSettings: {
            ...(contacts.chatSettings || {}),
            startTime: chatStartTime,
            endTime: chatEndTime,
            workDays: chatWorkDays,
            iconPosition: chatIconPosition,
            color: chatColor,
            greeting: chatGreeting,
          },
        },
        display: {
          ...display,
          palette: normalizedSitePalette,
        },
        siteLogo: logoPreview,
        favicon: faviconPreview,
      };

      await saveSettings(dataToSave);

      setSaveMessage("Изменения сохранены");
      setTimeout(() => setSaveMessage(""), 2200);
    } catch (err) {
      console.error("Ошибка в handleSubmit:", err);
      setErrorMessage("Ошибка сохранения настроек");
      setTimeout(() => setErrorMessage(""), 3500);
    }
  };

  // Лого
  const handleLogoChange = (e) => {
    setLogoError("");
    const file = e.target.files[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      setSiteLogo(null);
      return;
    }
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setLogoError("Разрешены только PNG, JPG, WEBP");
      setLogoFile(null);
      setLogoPreview(null);
      setSiteLogo(null);
      return;
    }
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = function (ev) {
      img.onload = function () {
        if (img.width > 300 || img.height > 150) {
          setLogoError("Максимальный размер логотипа 300×150 пикселей");
          setLogoFile(null);
          setLogoPreview(null);
          setSiteLogo(null);
        } else {
          setLogoPreview(ev.target.result);
          setLogoFile(file);
          setSiteLogo(ev.target.result);
        }
      };
      img.onerror = function () {
        setLogoError("Не удалось прочитать изображение");
        setLogoFile(null);
        setLogoPreview(null);
        setSiteLogo(null);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (e) => {
    e.stopPropagation();
    setLogoFile(null);
    setLogoPreview(null);
    setSiteLogo(null);
    setLogoError("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  // Фавикон
  const handleFaviconChange = (e) => {
    const file = e.target.files[0];
    if (
      file &&
      (file.type === "image/x-icon" || file.type === "image/png" || file.type === "image/svg+xml")
    ) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFaviconPreview(ev.target.result);
        setFavicon(ev.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFaviconFile(null);
      setFaviconPreview(null);
      setFavicon(null);
    }
  };

  const handleRemoveFavicon = (e) => {
    e.stopPropagation();
    setFaviconFile(null);
    setFaviconPreview(null);
    setFavicon(null);
    if (faviconInputRef.current) {
      faviconInputRef.current.value = "";
    }
  };

  // Чекбоксы главной
  const handleCheckbox = (key) => setDisplay((prev) => ({ ...prev, [key]: !prev[key] }));

  // Телефоны
  const handlePhoneChange = (idx, field, value) => {
    setPhones((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };
  const handleAddPhone = () => {
    if (phones.length < 3) setPhones([...phones, { phone: "", comment: "" }]);
  };
  const handleRemovePhone = (idx) => setPhones(phones.filter((_, i) => i !== idx));

  // ========= SITE (новое) =========
  const [verticalMenu, setVerticalMenu] = useState([]);
  const [horizontalMenu, setHorizontalMenu] = useState([]);
  const [showcaseEnabled, setShowcaseEnabled] = useState(true);
  const [showcaseIds, setShowcaseIds] = useState([]);

  // модалка выбора товаров
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [pickerGroup, setPickerGroup] = useState("");
  const [pickerInStock, setPickerInStock] = useState("");
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerLimit, setPickerLimit] = useState(20);
  const [pickerData, setPickerData] = useState({ items: [], total: 0, pages: 1 });
  const [groups, setGroups] = useState([]);
  const [savingSite, setSavingSite] = useState(false);
  const [siteMsg, setSiteMsg] = useState("");

  // При первом открытии вкладки "site" подтягиваем текущие значения с бэка
  useEffect(() => {
    if (tab !== "site") return;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/site-settings`);
        const json = await r.json();
        setVerticalMenu(sanitizeMenuArray(json.verticalMenu || []));
        setHorizontalMenu(sanitizeMenuArray(json.horizontalMenu || []));
        setShowcaseEnabled(json?.showcase?.enabled ?? true);
        setShowcaseIds((json?.showcase?.productIds || []).map(String));
      } catch (e) {
        console.error("load site-settings failed", e);
      }
    })();
  }, [tab]);

  // Список групп (для фильтра витрины)
  useEffect(() => {
    if (tab !== "site" || !token) return;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/products/groups`, { headers: authHeaders });
        if (r.ok) setGroups(await r.json());
      } catch (e) {
        console.error("load groups failed", e);
      }
    })();
  }, [tab, token, authHeaders]);

  // Загрузка товаров в модалке
  useEffect(() => {
    if (!pickerOpen || !token) return;
    (async () => {
      try {
        const qs = new URLSearchParams({
          q: pickerQ,
          groupId: pickerGroup,
          inStock: pickerInStock,
          page: String(pickerPage),
          limit: String(pickerLimit),
        });
        const r = await fetch(`${API_URL}/api/products/admin?` + qs.toString(), {
          headers: authHeaders,
        });
        if (r.ok) setPickerData(await r.json());
      } catch (e) {
        console.error("load products for picker failed", e);
      }
    })();
  }, [pickerOpen, pickerQ, pickerGroup, pickerInStock, pickerPage, pickerLimit, token, authHeaders]);

  const moveItem = (list, setList, idx, dir) => {
    const arr = [...list];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    const [it] = arr.splice(idx, 1);
    arr.splice(to, 0, it);
    setList(arr.map((x, i) => ({ ...x, order: i })));
  };
  const addItem = (list, setList) => setList([...list, newMenuItem(list.length)]);
  const removeItem = (list, setList, idx) => {
    const arr = [...list];
    arr.splice(idx, 1);
    setList(arr.map((x, i) => ({ ...x, order: i })));
  };
  const updateItem = (list, setList, idx, patch) => {
    const arr = [...list];
    arr[idx] = { ...arr[idx], ...patch };
    setList(arr);
  };

  const togglePick = () => setPickerOpen(true);
  const toggleSelected = (id) => {
    id = String(id);
    setShowcaseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const saveSiteTab = async () => {
    setSavingSite(true);
    setSiteMsg("");
    try {
      const payload = {
        verticalMenu: verticalMenu.map((x, i) => ({
          title: x.title?.trim() || "Без названия",
          url: x.url?.trim() || "/",
          visible: !!x.visible,
          order: i,
        })),
        horizontalMenu: horizontalMenu.map((x, i) => ({
          title: x.title?.trim() || "Без названия",
          url: x.url?.trim() || "/",
          visible: !!x.visible,
          order: i,
        })),
        showcase: {
          enabled: !!showcaseEnabled,
          productIds: showcaseIds,
        },
      };

      const r = await fetch(`${API_URL}/api/site-settings`, {
        method: "PUT",
        headers: authHeaders, // содержит Authorization: Bearer <token>
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Ошибка сохранения");
      }

      setSiteMsg("Изменения сохранены");
      setTimeout(() => setSiteMsg(""), 2200);
    } catch (e) {
      console.error(e);
      setSiteMsg(e.message || "Ошибка сохранения");
      setTimeout(() => setSiteMsg(""), 3000);
    } finally {
      setSavingSite(false);
    }
  };

  return (
    <div className="admin-settings-root">
      <aside className="settings-menu-vertical">
        <div className="settings-menu-title">Настройки</div>
        {SETTINGS_MENU.map((item) => (
          <button
            key={item.key}
            className={"settings-menu-btn" + (tab === item.key ? " active" : "")}
            onClick={() => setTab(item.key)}
            type="button"
          >
            {item.title}
          </button>
        ))}
      </aside>

      <div className="settings-content">
        <div className="settings-content-inner">
          {tab === "main" && (
            <form onSubmit={handleSubmit} className="settings-section">
              {/* Название сайта */}
              <div className="settings-block">
                <h2 className="settings-title">Название сайта</h2>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Укажите название сайта"
                  className="settings-input-wide"
                />
              </div>

              {/* Контакты */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Контакты</h3>
                <div className="settings-grid-2">
                  <div>
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-mail"
                      className="settings-input-wide"
                    />
                  </div>
                  <div>
                    <label>Контактное лицо</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Контактное лицо"
                      className="settings-input-wide"
                    />
                  </div>
                </div>
                <div className="settings-grid-2">
                  <div style={{ gridColumn: "1 / span 2" }}>
                    <label>Адрес</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Укажите адрес"
                      className="settings-input-wide"
                    />
                  </div>
                </div>
                {phones.map((phoneObj, idx) => (
                  <div className="settings-grid-2" key={idx}>
                    <div className="settings-phone-field">
                      <label>Телефон</label>
                      <input
                        type="tel"
                        value={phoneObj.phone}
                        onChange={(e) => handlePhoneChange(idx, "phone", e.target.value)}
                        placeholder="Телефон"
                        className="settings-input-wide"
                      />
                      {phones.length > 1 && (
                        <button
                          type="button"
                          title="Удалить"
                          className="settings-remove-btn"
                          onClick={() => handleRemovePhone(idx)}
                          tabIndex={-1}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div>
                      <label>Комментарий</label>
                      <input
                        type="text"
                        value={phoneObj.comment}
                        onChange={(e) => handlePhoneChange(idx, "comment", e.target.value)}
                        placeholder="Комментарий"
                        className="settings-input-wide"
                      />
                    </div>
                  </div>
                ))}
                {phones.length < 3 && (
                  <button type="button" className="settings-add-btn" onClick={handleAddPhone}>
                    + добавить ещё
                  </button>
                )}
              </div>

              {/* Отображение на сайте */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Отображение на главной</h3>
                <div className="settings-checkbox-list">
                  <label>
                    <input
                      type="checkbox"
                      checked={!!display.chat}
                      onChange={() => handleCheckbox("chat")}
                    />
                    Отображать Чат
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!display.categories}
                      onChange={() => handleCheckbox("categories")}
                    />
                    Отображать Категории
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!display.showcase}
                      onChange={() => handleCheckbox("showcase")}
                    />
                    Отображать Витрину
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!display.promos}
                      onChange={() => handleCheckbox("promos")}
                    />
                    Отображать Акции и Скидки
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!display.blog}
                      onChange={() => handleCheckbox("blog")}
                    />
                    Отображать Блог
                  </label>
                </div>
              </div>

              {/* Логотип */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Логотип</h3>
                <div className="settings-logo-row">
                  <div>
                    <div
                      className="settings-logo-uploader"
                      onClick={() => logoInputRef.current.click()}
                      title="Загрузить логотип"
                      style={{ cursor: "pointer" }}
                    >
                      {logoPreview ? (
                        <>
                          <img src={logoPreview} alt="Логотип" className="settings-logo-preview-img" />
                          <button
                            className="settings-logo-remove-btn"
                            type="button"
                            onClick={handleRemoveLogo}
                            tabIndex={-1}
                            title="Удалить логотип"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span className="settings-logo-plus">+</span>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        ref={logoInputRef}
                        style={{ display: "none" }}
                        onChange={handleLogoChange}
                      />
                    </div>
                    {logoError && <div className="logo-error-message">{logoError}</div>}
                    <div className="settings-logo-hint" style={{ marginTop: 10 }}>
                      Рекомендуемый размер: <span>160×120px</span>, png/webp/jpg (макс. 300×150)
                    </div>
                  </div>
                </div>
              </div>

              {/* Фавикон */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Фавикон</h3>
                <div className="settings-logo-row">
                  <div>
                    <div
                      className="settings-favicon-uploader"
                      onClick={() => faviconInputRef.current.click()}
                      title="Загрузить фавикон"
                      style={{ cursor: "pointer" }}
                    >
                      {faviconPreview ? (
                        <>
                          <img src={faviconPreview} alt="Фавикон" className="settings-favicon-preview-img" />
                          <button
                            className="settings-logo-remove-btn"
                            type="button"
                            onClick={handleRemoveFavicon}
                            tabIndex={-1}
                            title="Удалить фавикон"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span className="settings-logo-plus">+</span>
                      )}
                      <input
                        type="file"
                        accept="image/x-icon,image/png,image/svg+xml"
                        ref={faviconInputRef}
                        style={{ display: "none" }}
                        onChange={handleFaviconChange}
                      />
                    </div>
                    <div className="settings-logo-hинt" style={{ marginTop: 10 }}>
                      32×32px, .ico, .png, .svg
                    </div>
                  </div>
                </div>
              </div>

              {/* Управление Чатом */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Управление Чатом</h3>
                <div className="settings-grid-2">
                  <div>
                    <label>Время работы чата (Начало)</label>
                    <input
                      type="time"
                      value={chatStartTime}
                      onChange={(e) => setChatStartTime(e.target.value)}
                      className="settings-input-wide"
                    />
                  </div>
                  <div>
                    <label>Время работы чата (Конец)</label>
                    <input
                      type="time"
                      value={chatEndTime}
                      onChange={(e) => setChatEndTime(e.target.value)}
                      className="settings-input-wide"
                    />
                  </div>
                </div>
                <div style={{ marginTop: 16, marginBottom: 6 }}>
                  <div
                    className="settings-subtitle"
                    style={{ marginBottom: 7, fontSize: 17, color: "#2175f3" }}
                  >
                    Рабочие дни чата
                  </div>
                  <div className="chat-days-off-row">
                    {WEEK_DAYS.map((day) => (
                      <label key={day.key} className="chat-days-off-label">
                        <input
                          type="checkbox"
                          checked={chatWorkDays.includes(day.key)}
                          onChange={(e) => {
                            setChatWorkDays((prev) =>
                              e.target.checked
                                ? [...prev, day.key]
                                : prev.filter((d) => d !== day.key)
                            );
                          }}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <div
                    style={{
                      fontWeight: "400",
                      fontSize: "18px",
                      color: "#2175f3",
                      marginBottom: "8px",
                    }}
                  >
                    Положение иконки
                  </div>
                  <label
                    style={{
                      marginRight: "25px",
                      fontSize: "18px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="radio"
                      name="chatIconPosition"
                      value="left"
                      checked={chatIconPosition === "left"}
                      onChange={() => setChatIconPosition("left")}
                      style={{ width: "18px", height: "18px", marginRight: "8px" }}
                    />
                    Слева
                  </label>
                  <label
                    style={{
                      fontSize: "18px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="radio"
                      name="chatIconPosition"
                      value="right"
                      checked={chatIconPosition === "right"}
                      onChange={() => setChatIconPosition("right")}
                      style={{ width: "18px", height: "18px", marginRight: "8px" }}
                    />
                    Справа
                  </label>
                </div>
                <div className="settings-subtitle" style={{ marginTop: "16px" }}>
                  Цвет чата
                </div>
                <div className="chat-color-palette">
                  {COLOR_PALETTE.map((color) => (
                    <div
                      key={color}
                      className={"color-circle" + (chatColor === color ? " selected" : "")}
                      style={{
                        background: `linear-gradient(135deg, ${color} 48%, #fff 52%)`,
                        border: "2px solid #222",
                        width: 24,
                        height: 24,
                        boxShadow:
                          chatColor === color
                            ? `0 0 0 3px ${color}44, 0 0 6px 2px ${color}88`
                            : "none",
                        transform: chatColor === color ? "scale(1.13)" : "scale(1)",
                        transition: "box-shadow 0.16s, transform 0.17s",
                        cursor: "pointer",
                      }}
                      onClick={() => handleChatColorSelect(color)}
                      title={`Выбрать цвет для чата ${color}`}
                    />
                  ))}
                </div>
                <div style={{ marginTop: "24px" }}>
                  <label
                    htmlFor="chatGreeting"
                    style={{
                      fontWeight: "400",
                      fontSize: "18px",
                      color: "#2175f3",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Приветствие (Сообщение перед началом чата)
                  </label>
                  <textarea
                    id="chatGreeting"
                    value={chatGreeting}
                    onChange={(e) => setChatGreeting(e.target.value)}
                    className="settings-input-wide"
                    rows={3}
                    placeholder="Введите приветственное сообщение для пользователей..."
                    style={{ resize: "none" }}
                  />
                </div>
              </div>

              {/* Дизайн сайта */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Дизайн сайта</h3>
                <div className="design-section-label" style={{ marginBottom: 8, marginTop: 6 }}>
                  Выберите цвет сайта
                </div>
                <div className="design-palette-row">
                  {COLOR_PALETTE.map((color) => (
                    <div
                      key={color}
                      className={
                        "design-color-circle" + (sitePalettePrimary === color ? " selected" : "")
                      }
                      style={{
                        background: `linear-gradient(135deg, ${color} 48%, #fff 52%)`,
                        borderColor: "#222",
                        cursor: "pointer",
                      }}
                      onClick={() => handleSitePaletteSelect(color)}
                      title={color}
                    />
                  ))}
                </div>

                <div className="design-section-label" style={{ marginTop: 32, marginBottom: 13 }}>
                  Выберите дизайн
                </div>
                <div className="design-templates-row">
                  {[
                    { key: "standard", label: "Стандартный", preview: "/images/standartdesing.png" },
                    { key: "phoenix", label: "Феникс", preview: "/images/phoenix.png" },
                    { key: "red-dove", label: "Красный Голубь", preview: "/images/red-dove.png" },
                    {
                      key: "turquoise-swallow",
                      label: "Бирюзовая Ласточка",
                      preview: "/images/turquoise-swallow.png",
                    },
                  ].map((tpl) => {
                    const isSelected = (display.template || "standard") === tpl.key;
                    return (
                      <div
                        key={tpl.key}
                        className={"design-template-label" + (isSelected ? " selected" : "")}
                      >
                        <input
                          type="radio"
                          name="siteTemplate"
                          value={tpl.key}
                          checked={isSelected}
                          onChange={() => setDisplay((d) => ({ ...d, template: tpl.key }))}
                          style={{ display: "none" }}
                        />
                        <img src={tpl.preview} alt={tpl.label} className="design-template-preview" />
                        <span className="design-template-title">{tpl.label}</span>
                        <button
                          className="apply-template-btn"
                          type="button"
                          disabled={!isSelected}
                          style={{
                            opacity: isSelected ? 1 : 0.67,
                            pointerEvents: isSelected ? "auto" : "none",
                          }}
                        >
                          Применить
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {saveMessage && <div className="settings-success-message">{saveMessage}</div>}
              {errorMessage && <div className="logo-error-message">{errorMessage}</div>}

              <button type="submit" className="settings-save-btn">
                Сохранить
              </button>
            </form>
          )}

          {tab === "site" && (
            <div className="settings-section">

              {/* Вертикальное меню */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Вертикальное меню</h3>
                <div className="menu-editor">
                  {verticalMenu.map((item, idx) => (
                    <div className="menu-row" key={item._id}>
                      <input
                        className="menu-input"
                        placeholder="Название"
                        value={item.title}
                        onChange={(e) =>
                          updateItem(verticalMenu, setVerticalMenu, idx, { title: e.target.value })
                        }
                      />
                      <input
                        className="menu-input"
                        placeholder="Ссылка /url"
                        value={item.url}
                        onChange={(e) =>
                          updateItem(verticalMenu, setVerticalMenu, idx, { url: e.target.value })
                        }
                      />
                      <label className="menu-visible">
                        <input
                          type="checkbox"
                          checked={!!item.visible}
                          onChange={(e) =>
                            updateItem(verticalMenu, setVerticalMenu, idx, {
                              visible: e.target.checked,
                            })
                          }
                        />
                        Видно
                      </label>
                      <div className="menu-actions">
                        <button onClick={() => moveItem(verticalMenu, setVerticalMenu, idx, -1)}>
                          ↑
                        </button>
                        <button onClick={() => moveItem(verticalMenu, setVerticalMenu, idx, 1)}>
                          ↓
                        </button>
                        <button
                          className="danger"
                          onClick={() => removeItem(verticalMenu, setVerticalMenu, idx)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="menu-footer">
                    <button onClick={() => addItem(verticalMenu, setVerticalMenu)}>
                      + Добавить пункт
                    </button>
                  </div>
                </div>
              </div>

              {/* Горизонтальное меню */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Горизонтальное меню</h3>
                <div className="menu-editor">
                  {horizontalMenu.map((item, idx) => (
                    <div className="menu-row" key={item._id}>
                      <input
                        className="menu-input"
                        placeholder="Название"
                        value={item.title}
                        onChange={(e) =>
                          updateItem(horizontalMenu, setHorizontalMenu, idx, {
                            title: e.target.value,
                          })
                        }
                      />
                      <input
                        className="menu-input"
                        placeholder="Ссылка /url"
                        value={item.url}
                        onChange={(e) =>
                          updateItem(horizontalMenu, setHorizontalMenu, idx, {
                            url: e.target.value,
                          })
                        }
                      />
                      <label className="menu-visible">
                        <input
                          type="checkbox"
                          checked={!!item.visible}
                          onChange={(e) =>
                            updateItem(horizontalMenu, setHorizontalMenu, idx, {
                              visible: e.target.checked,
                            })
                          }
                        />
                        Видно
                      </label>
                      <div className="menu-actions">
                        <button onClick={() => moveItem(horizontalMenu, setHorizontalMenu, idx, -1)}>
                          ↑
                        </button>
                        <button onClick={() => moveItem(horizontalMenu, setHorizontalMenu, idx, 1)}>
                          ↓
                        </button>
                        <button
                          className="danger"
                          onClick={() => removeItem(horizontalMenu, setHorizontalMenu, idx)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="menu-footer">
                    <button onClick={() => addItem(horizontalMenu, setHorizontalMenu)}>
                      + Добавить пункт
                    </button>
                  </div>
                </div>
              </div>

              {/* Витрина */}
              <div className="settings-block">
                <h3 className="settings-subtitle">Витрина</h3>
                <div className="showcase-block">

                  <div className="chips">
                    {showcaseIds.length === 0 && <div className="chip muted">Товары не выбраны</div>}
                    {showcaseIds.map((id) => (
                      <div key={id} className="chip">
                        {id}
                        <button onClick={() => setShowcaseIds((prev) => prev.filter((x) => x !== id))}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <button onClick={togglePick}>Выбрать товары</button>
                </div>

                <div className="savebar" style={{ marginTop: 10 }}>
                  <button className="primary" disabled={savingSite} onClick={saveSiteTab}>
                    {savingSite ? "Сохранение..." : "Сохранить изменения"}
                  </button>
                </div>
                {siteMsg && <div className="settings-success-message">{siteMsg}</div>}
              </div>
            </div>
          )}

          {/* Заглушки для остальных вкладок */}
          {tab !== "main" && tab !== "site" && (
            <div className="settings-section">
              <h2>{SETTINGS_MENU.find((item) => item.key === tab)?.title || "Раздел"}</h2>
              <div className="settings-section-content">
                Здесь можно редактировать содержимое раздела "{tab}"
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модалка выбора товаров для витрины */}
      {pickerOpen && (
        <div className="modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Добавить товары в витрину</h3>
              <button className="icon" onClick={() => setPickerOpen(false)}>
                ✕
              </button>
            </div>

            <div className="filters">
              <input
                placeholder="Поиск по названию"
                value={pickerQ}
                onChange={(e) => {
                  setPickerPage(1);
                  setPickerQ(e.target.value);
                }}
              />
              <select
                value={pickerGroup}
                onChange={(e) => {
                  setPickerPage(1);
                  setPickerGroup(e.target.value);
                }}
              >
                <option value="">Все группы</option>
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                value={pickerInStock}
                onChange={(e) => {
                  setPickerPage(1);
                  setPickerInStock(e.target.value);
                }}
              >
                <option value="">Все</option>
                <option value="true">В наличии</option>
                <option value="false">Нет в наличии</option>
              </select>
              <select
                value={pickerLimit}
                onChange={(e) => {
                  setPickerPage(1);
                  setPickerLimit(Number(e.target.value));
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
              </select>
            </div>

            <div className="list">
              {pickerData.items.map((p) => (
                <label key={p._id} className="product-row">
                  <input
                    type="checkbox"
                    checked={showcaseIds.includes(String(p._id))}
                    onChange={() => toggleSelected(p._id)}
                  />
                  <img src={`${API_URL}${p.images?.[0] || ''}`} alt="" />
                  <div className="col">
                    <div className="name">{p.name}</div>
                    <div className="meta">
                      {(() => {
                        const avail = (p.availability || '').trim();
                        const text =
                          avail === 'В наличии' ? 'В наличии'
                          : avail === 'Под заказ' ? 'Под заказ'
                          : 'Нет в наличии';
                        const cls =
                          avail === 'В наличии' ? 'ok'
                          : avail === 'Под заказ' ? 'warn'
                          : 'bad';
                        return <span className={cls}>{text}</span>;
                      })()}
                      <span className="price">{(p.price ?? 0).toLocaleString('uk-UA')} ₴</span>
                    </div>
                  </div>
                </label>
              ))}
              {pickerData.items.length === 0 && <div className="empty">Ничего не найдено</div>}
            </div>

            <div className="pager">
              <button disabled={pickerPage <= 1} onClick={() => setPickerPage((p) => p - 1)}>
                ←
              </button>
              <span>
                {pickerPage} / {pickerData.pages}
              </span>
              <button
                disabled={pickerPage >= pickerData.pages}
                onClick={() => setPickerPage((p) => p + 1)}
              >
                →
              </button>
            </div>

            <div className="modal-foot">
              <button className="primary" onClick={() => setPickerOpen(false)}>
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

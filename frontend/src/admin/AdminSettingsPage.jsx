import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import "../assets/AdminSettingsPage.css";

import { useSite } from "../context/SiteContext";
import { DISPLAY_DEFAULT, PALETTES } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api.js";

/* SVG-плейсхолдер */
const NOIMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
      <rect width="100%" height="100%" fill="#f2f4f7"/>
      <g fill="#b9c2cf" font-family="Arial,Helvetica,sans-serif" font-size="12">
        <rect x="30" y="30" width="100" height="60" rx="8" ry="8" fill="#dfe4ea"/>
        <text x="80" y="65" text-anchor="middle">no image</text>
      </g>
    </svg>`
  );

const COLOR_PALETTE = ["#2291ff","#4caf50","#ff9800","#f44336","#e91e63","#a9744f","#9c27b0","#00bcd4"];

function getPaletteWithFooter(primary) {
  const base =
    PALETTES[primary] || { ...DISPLAY_DEFAULT.palette, primary, "footer-bg": "#232a34" };
  return { ...base, "side-menu-border": primary };
}

export default function AdminSettingsPage() {
  const {
    siteName, setSiteName,
    contacts, setContacts,
    display, setDisplay,
    siteLogo, setSiteLogo,
    favicon, setFavicon,
    saveSettings,
  } = useSite();

  const { user } = useAuth();
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get("tab") || "main";

  /* ===== MAIN ===== */
  const [email, setEmail] = useState(contacts?.email || "");
  const [contactPerson, setContactPerson] = useState(contacts?.contactPerson || "");
  const [address, setAddress] = useState(contacts?.address || "");
  const [phones, setPhones] = useState(
    contacts?.phones?.length ? contacts.phones : [{ phone: "", comment: "" }]
  );

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(siteLogo || null);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef();

  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(favicon || null);
  const faviconInputRef = useRef();

  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sitePrimary = display?.palette?.primary || COLOR_PALETTE[0];

  useEffect(() => {
    setEmail(contacts?.email || "");
    setContactPerson(contacts?.contactPerson || "");
    setAddress(contacts?.address || "");
    setPhones(contacts?.phones?.length ? contacts.phones : [{ phone: "", comment: "" }]);
    setLogoPreview(siteLogo || null);
  }, [contacts, siteLogo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSaveMessage("");
    try {
      await saveSettings({
        siteName,
        contacts: { ...contacts, email, contactPerson, address, phones },
        display: { ...display, palette: getPaletteWithFooter(sitePrimary) },
        siteLogo: logoPreview,
        favicon: faviconPreview,
      });
      setSaveMessage("Изменения сохранены");
      setTimeout(() => setSaveMessage(""), 2200);
    } catch (err) {
      console.error(err);
      setErrorMessage("Ошибка сохранения настроек");
      setTimeout(() => setErrorMessage(""), 3500);
    }
  };

  const handleLogoChange = (e) => {
    setLogoError("");
    const file = e.target.files[0];
    if (!file) {
      setLogoFile(null); setLogoPreview(null); setSiteLogo(null); return;
    }
    const ok = ["image/png","image/jpeg","image/jpg","image/webp"].includes(file.type);
    if (!ok) {
      setLogoError("Разрешены только PNG, JPG, WEBP");
      setLogoFile(null); setLogoPreview(null); setSiteLogo(null); return;
    }
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        if (img.width > 300 || img.height > 150) {
          setLogoError("Максимальный размер логотипа 300×150");
          setLogoFile(null); setLogoPreview(null); setSiteLogo(null);
        } else {
          setLogoPreview(ev.target.result);
          setLogoFile(file);
          setSiteLogo(ev.target.result);
        }
      };
      img.onerror = () => {
        setLogoError("Не удалось прочитать изображение");
        setLogoFile(null); setLogoPreview(null); setSiteLogo(null);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  const handleRemoveLogo = (e) => {
    e.stopPropagation(); setLogoFile(null); setLogoPreview(null); setSiteLogo(null); setLogoError("");
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files[0];
    if (file && ["image/x-icon","image/png","image/svg+xml"].includes(file.type)) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => { setFaviconPreview(ev.target.result); setFavicon(ev.target.result); };
      reader.readAsDataURL(file);
    } else { setFaviconFile(null); setFaviconPreview(null); setFavicon(null); }
  };
  const handleRemoveFavicon = (e) => {
    e.stopPropagation(); setFaviconFile(null); setFaviconPreview(null); setFavicon(null);
    if (faviconInputRef.current) faviconInputRef.current.value = "";
  };

  const handleCheckbox = (key) => setDisplay((prev) => ({ ...prev, [key]: !prev[key] }));
  const handlePhoneChange = (i, field, val) =>
    setPhones((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  const handleAddPhone = () => { if (phones.length < 3) setPhones([...phones, { phone: "", comment: "" }]); };
  const handleRemovePhone = (idx) => setPhones(phones.filter((_, i) => i !== idx));

  /* ===== SITE tab (управление меню/витриной) — без «Дизайна сайта» ===== */
  const [verticalMenu, setVerticalMenu] = useState([]);
  const [horizontalMenu, setHorizontalMenu] = useState([]);
  const [showcaseEnabled, setShowcaseEnabled] = useState(true);
  const [showcaseIds, setShowcaseIds] = useState([]);

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

  const newMenuItem = (order = 0) => ({
    _id: crypto.randomUUID(),
    title: "",
    url: "/",
    visible: true,
    order,
  });

  const sanitizeMenuArray = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map((it, i) => ({
        _id: it._id || crypto.randomUUID(),
        title: (it.title || "").trim(),
        url: (it.url || "/").trim(),
        visible: !!it.visible,
        order: Number.isFinite(+it.order) ? +it.order : i,
      }))
      .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (tab !== "site") return;
    (async () => {
      try {
        const { data: json } = await api.get(`/api/site-settings`);
        setVerticalMenu(sanitizeMenuArray(json.verticalMenu || []));
        setHorizontalMenu(sanitizeMenuArray(json.horizontalMenu || []));
        setShowcaseEnabled(json?.showcase?.enabled ?? true);
        setShowcaseIds((json?.showcase?.productIds || []).map(String));
      } catch (e) { console.error("load site-settings failed", e); }
    })();
  }, [tab]);

  useEffect(() => {
    if (tab !== "site") return;
    (async () => {
      try {
        const { data } = await api.get(`/api/products/groups`);
        setGroups(Array.isArray(data) ? data : []);
      } catch (e) { console.error("load groups failed", e); }
    })();
  }, [tab]);

  useEffect(() => {
    if (!pickerOpen) return;
    (async () => {
      try {
        const qs = new URLSearchParams({
          q: pickerQ, groupId: pickerGroup, inStock: pickerInStock,
          page: String(pickerPage), limit: String(pickerLimit),
        }).toString();
        const { data } = await api.get(`/api/products/admin?${qs}`);
        setPickerData(data);
      } catch (e) { console.error("load products for picker failed", e); }
    })();
  }, [pickerOpen, pickerQ, pickerGroup, pickerInStock, pickerPage, pickerLimit]);

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
    const arr = [...list]; arr.splice(idx, 1);
    setList(arr.map((x, i) => ({ ...x, order: i })));
  };
  const updateItem = (list, setList, idx, patch) => {
    const arr = [...list]; arr[idx] = { ...arr[idx], ...patch }; setList(arr);
  };

  const togglePick = () => setPickerOpen(true);
  const toggleSelected = (id) =>
    setShowcaseIds((prev) =>
      prev.includes(String(id)) ? prev.filter((x) => x !== String(id)) : [...prev, String(id)]
    );

  const saveSiteTab = async () => {
    setSavingSite(true); setSiteMsg("");
    try {
      await api.put(`/api/site-settings`, {
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
        showcase: { enabled: !!showcaseEnabled, productIds: showcaseIds },
      });
      setSiteMsg("Изменения сохранены");
      setTimeout(() => setSiteMsg(""), 2200);
    } catch (e) {
      console.error(e);
      setSiteMsg(e.message || "Ошибка сохранения");
      setTimeout(() => setSiteMsg(""), 3000);
    } finally { setSavingSite(false); }
  };

  return (
    <div className="settings-page admin-content with-submenu">
      <AdminSubMenu type="settings" />

      <div className="settings-body">
        <div className="admin-settings-root">
          <div className="settings-content">
            <div className="settings-content-inner">
              {/* ===== Основные ===== */}
              {tab === "main" && (
                <form onSubmit={handleSubmit} className="settings-section">
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

                    {phones.map((ph, idx) => (
                      <div className="settings-grid-2" key={idx}>
                        <div className="settings-phone-field">
                          <label>Телефон</label>
                          <input
                            type="tel"
                            value={ph.phone}
                            onChange={(e) => setPhones(prev => prev.map((p,i)=> i===idx?{...p,phone:e.target.value}:p))}
                            placeholder="Телефон"
                            className="settings-input-wide"
                          />
                          {phones.length > 1 && (
                            <button
                              type="button"
                              title="Удалить"
                              className="settings-remove-btn"
                              onClick={() => setPhones(phones.filter((_, i) => i !== idx))}
                              tabIndex={-1}
                            >×</button>
                          )}
                        </div>
                        <div>
                          <label>Комментарий</label>
                          <input
                            type="text"
                            value={ph.comment}
                            onChange={(e) => setPhones(prev => prev.map((p,i)=> i===idx?{...p,comment:e.target.value}:p))}
                            placeholder="Комментарий"
                            className="settings-input-wide"
                          />
                        </div>
                      </div>
                    ))}
                    {phones.length < 3 && (
                      <button type="button" className="settings-add-btn" onClick={() => setPhones([...phones,{phone:"",comment:""}])}>
                        + добавить ещё
                      </button>
                    )}
                  </div>

                  {/* Отображение на главной */}
                  <div className="settings-block">
                    <h3 className="settings-subtitle">Отображение на главной</h3>
                    <div className="settings-checkbox-list">
                      <label><input type="checkbox" checked={!!display.categories} onChange={()=>handleCheckbox("categories")} />Категории</label>
                      <label><input type="checkbox" checked={!!display.showcase}   onChange={()=>handleCheckbox("showcase")} />Витрина</label>
                      <label><input type="checkbox" checked={!!display.promos}     onChange={()=>handleCheckbox("promos")} />Акции и Скидки</label>
                      <label><input type="checkbox" checked={!!display.blog}       onChange={()=>handleCheckbox("blog")} />Блог</label>
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
                              <button className="settings-logo-remove-btn" type="button" onClick={handleRemoveLogo} tabIndex={-1} title="Удалить логотип">×</button>
                            </>
                          ) : (<span className="settings-logo-plus">+</span>)}
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
                              <button className="settings-logo-remove-btn" type="button" onClick={handleRemoveFavicon} tabIndex={-1} title="Удалить фавикон">×</button>
                            </>
                          ) : (<span className="settings-logo-plus">+</span>)}
                          <input
                            type="file"
                            accept="image/x-icon,image/png,image/svg+xml"
                            ref={faviconInputRef}
                            style={{ display: "none" }}
                            onChange={handleFaviconChange}
                          />
                        </div>
                        <div className="settings-logo-hint" style={{ marginTop: 10 }}>
                          32×32px, .ico, .png, .svg
                        </div>
                      </div>
                    </div>
                  </div>

                  {saveMessage && <div className="settings-success-message">{saveMessage}</div>}
                  {errorMessage && <div className="logo-error-message">{errorMessage}</div>}

                  <button type="submit" className="settings-save-btn">Сохранить</button>
                </form>
              )}

              {/* ===== Управление сайтом (меню/витрина) ===== */}
              {tab === "site" && (
                <div className="settings-section">
                  <div className="settings-block">
                    <h3 className="settings-subtitle">Вертикальное меню</h3>
                    <div className="menu-editor">
                      {verticalMenu.map((item, idx) => (
                        <div className="menu-row" key={item._id}>
                          <input className="menu-input" placeholder="Название"
                                 value={item.title}
                                 onChange={(e)=>updateItem(verticalMenu,setVerticalMenu,idx,{title:e.target.value})}/>
                          <input className="menu-input" placeholder="Ссылка /url"
                                 value={item.url}
                                 onChange={(e)=>updateItem(verticalMenu,setVerticalMenu,idx,{url:e.target.value})}/>
                          <label className="menu-visible">
                            <input type="checkbox" checked={!!item.visible}
                                   onChange={(e)=>updateItem(verticalMenu,setVerticalMenu,idx,{visible:e.target.checked})}/>
                            Видно
                          </label>
                          <div className="menu-actions">
                            <button onClick={()=>moveItem(verticalMenu,setVerticalMenu,idx,-1)}>↑</button>
                            <button onClick={()=>moveItem(verticalMenu,setVerticalMenu,idx, 1)}>↓</button>
                            <button className="danger" onClick={()=>removeItem(verticalMenu,setVerticalMenu,idx)}>✕</button>
                          </div>
                        </div>
                      ))}
                      <div className="menu-footer">
                        <button onClick={()=>addItem(verticalMenu,setVerticalMenu)}>+ Добавить пункт</button>
                      </div>
                    </div>
                  </div>

                  <div className="settings-block">
                    <h3 className="settings-subtitle">Горизонтальное меню</h3>
                    <div className="menu-editor">
                      {horizontalMenu.map((item, idx) => (
                        <div className="menu-row" key={item._id}>
                          <input className="menu-input" placeholder="Название"
                                 value={item.title}
                                 onChange={(e)=>updateItem(horizontalMenu,setHorizontalMenu,idx,{title:e.target.value})}/>
                          <input className="menu-input" placeholder="Ссылка /url"
                                 value={item.url}
                                 onChange={(e)=>updateItem(horizontalMenu,setHorizontalMenu,idx,{url:e.target.value})}/>
                          <label className="menu-visible">
                            <input type="checkbox" checked={!!item.visible}
                                   onChange={(e)=>updateItem(horizontalMenu,setHorizontalMenu,idx,{visible:e.target.checked})}/>
                            Видно
                          </label>
                          <div className="menu-actions">
                            <button onClick={()=>moveItem(horizontalMenu,setHorizontalMenu,idx,-1)}>↑</button>
                            <button onClick={()=>moveItem(horizontalMenu,setHorizontalMenu,idx, 1)}>↓</button>
                            <button className="danger" onClick={()=>removeItem(horizontalMenu,setHorizontalMenu,idx)}>✕</button>
                          </div>
                        </div>
                      ))}
                      <div className="menu-footer">
                        <button onClick={()=>addItem(horizontalMenu,setHorizontalMenu)}>+ Добавить пункт</button>
                      </div>
                    </div>
                  </div>

                  <div className="settings-block">
                    <h3 className="settings-subtitle">Витрина</h3>
                    <div className="showcase-block">
                      <div className="chips">
                        {showcaseIds.length === 0 && <div className="chip muted">Товары не выбраны</div>}
                        {showcaseIds.map((id) => (
                          <div key={id} className="chip">
                            {id}
                            <button onClick={()=>setShowcaseIds(prev=>prev.filter(x=>x!==id))}>×</button>
                          </div>
                        ))}
                      </div>
                      <button onClick={()=>setPickerOpen(true)}>Выбрать товары</button>
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
            </div>
          </div>
        </div>
      </div>

      {/* Модалка выбора товаров */}
      {pickerOpen && (
        <div className="modal-backdrop" onClick={()=>setPickerOpen(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <h3>Добавить товары в витрину</h3>
              <button className="icon" onClick={()=>setPickerOpen(false)}>✕</button>
            </div>

            <div className="filters">
              <input placeholder="Поиск по названию" value={pickerQ}
                     onChange={(e)=>{ setPickerPage(1); setPickerQ(e.target.value); }}/>
              <select value={pickerGroup} onChange={(e)=>{ setPickerPage(1); setPickerGroup(e.target.value); }}>
                <option value="">Все группы</option>
                {groups.map((g)=> <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
              <select value={pickerInStock} onChange={(e)=>{ setPickerPage(1); setPickerInStock(e.target.value); }}>
                <option value="">Все</option>
                <option value="true">В наличии</option>
                <option value="false">Нет в наличии</option>
              </select>
              <select value={pickerLimit} onChange={(e)=>{ setPickerPage(1); setPickerLimit(Number(e.target.value)); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
              </select>
            </div>

            <div className="list">
              {pickerData.items.map((p)=>(
                <label key={p._id} className="product-row">
                  <input type="checkbox" checked={showcaseIds.includes(String(p._id))}
                         onChange={()=>toggleSelected(p._id)}/>
                  <img src={p.images?.[0] ? p.images[0] : NOIMG}
                       onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src = NOIMG; }}
                       alt=""/>
                  <div className="col">
                    <div className="name">{p.name}</div>
                    <div className="meta">
                      {(() => {
                        const avail = p.availability || "";
                        const text = avail === "published" ? "В наличии" : avail === "order" ? "Под заказ" : "Нет в наличии";
                        const cls  = avail === "published" ? "ok" : avail === "order" ? "warn" : "bad";
                        return <span className={cls}>{text}</span>;
                      })()}
                      <span className="price">{(p.price ?? 0).toLocaleString("uk-UA")} ₴</span>
                    </div>
                  </div>
                </label>
              ))}
              {pickerData.items.length === 0 && <div className="empty">Ничего не найдено</div>}
            </div>

            <div className="pager">
              <button disabled={pickerPage <= 1} onClick={()=>setPickerPage(p=>p-1)}>←</button>
              <span>{pickerPage} / {pickerData.pages}</span>
              <button disabled={pickerPage >= pickerData.pages} onClick={()=>setPickerPage(p=>p+1)}>→</button>
            </div>

            <div className="modal-foot">
              <button className="primary" onClick={()=>setPickerOpen(false)}>Готово</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

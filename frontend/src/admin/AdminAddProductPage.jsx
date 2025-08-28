import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LocalEditor from "../components/LocalEditor";
import AdminSubMenu from "./AdminSubMenu";
import api from "../utils/api.js";
import "../assets/AdminPanel.css";
import "../assets/AdminAddProductPage.css";
import AsyncGoogleCategorySelect from "../components/AsyncGoogleCategorySelect";

const genId = () => Math.random().toString(36).slice(2) + Date.now();
const MAX_IMAGES = 10; // до 10 фото
const NAME_MAX = 120;
const SKU_MAX = 64;
const DESC_MAX = 5000; // по тексту (без html)

const UNITS = [
  "шт","комплект","упаковка","пара","коробка","рулон",
  "кг","г","т","л","мл",
  "м","см","мм","м²","м³",
  "час","день","месяц","год",
  "услуга"
];

// регионы для мультиселекта
const UA_REGIONS = [
  "Киев", "Киевская область", "Львовская область", "Харьковская область",
  "Днепропетровская область", "Одесская область", "Запорожская область",
  "Николаевская область", "Полтавская область", "Черкасская область",
  "Винницкая область", "Ивано-Франковская область", "Ровенская область",
  "Тернопольская область", "Черниговская область"
];

const textLength = (html) => {
  if (!html) return 0;
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").trim().length;
};

/* ===== Простой мультиселект «Где находится товар» ===== */
function RegionMultiSelect({ options, value = [], onChange, placeholder = "Выберите регионы" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const toggle = (opt) => {
    const set = new Set(value);
    set.has(opt) ? set.delete(opt) : set.add(opt);
    onChange(Array.from(set));
  };

  const label = value.length ? value.join(", ") : placeholder;

  return (
    <div className="multi-select" ref={wrapRef}>
      <button type="button" className={`ms-trigger ${value.length ? "filled" : ""}`} onClick={() => setOpen(!open)}>
        {label}
        <span className={`chev ${open ? "up" : ""}`} />
      </button>
      {open && (
        <div className="ms-dropdown">
          {options.map((opt) => (
            <label key={opt} className="ms-option">
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== SVG Play badge (чёрный фон + белая стрелка) ===== */
function PlayBadge({ size = 20 }) {
  return (
    <span className="play-badge" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

/* ===== Эл-т «цена + валюта» в одном поле ===== */
function PriceWithCurrency({ value, currency, onChangeValue, onChangeCurrency }) {
  return (
    <div className="input-merge">
      <input type="number" value={value} onChange={e => onChangeValue(e.target.value)} placeholder="0" />
      <select value={currency} onChange={e => onChangeCurrency(e.target.value)}>
        <option value="UAH">₴</option>
        <option value="USD">$</option>
        <option value="EUR">€</option>
      </select>
    </div>
  );
}

export default function AdminAddProductPage() {
  const navigate = useNavigate();

  // Основная информация
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [descLen, setDescLen] = useState(0);

  // Медиа
  const [images, setImages] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const inputFileRef = useRef(null);
  const inputVideoRef = useRef(null);

  // Цена и наличие — НОВЫЙ БЛОК
  const [priceMode, setPriceMode] = useState("retail"); // retail | wholesale | both | service
  const [retailPrice, setRetailPrice] = useState("");
  const [retailCurrency, setRetailCurrency] = useState("UAH");
  const [priceFromFlag, setPriceFromFlag] = useState(false); // «цена от»

  const [wholesaleTiers, setWholesaleTiers] = useState([
    { id: genId(), price: "", currency: "UAH", minQty: "" },
  ]);

  const [unit, setUnit] = useState("шт");
  const [stockState, setStockState] = useState("in_stock"); // in_stock | preorder | out
  const [stock, setStock] = useState("");
  const [regions, setRegions] = useState([]);

  // Публикация
  const [visibility, setVisibility] = useState("published"); // published|hidden

  // Размещение
  const [groupsTree, setGroupsTree] = useState([]);
  const [group, setGroup] = useState("");
  const [groupExpanded, setGroupExpanded] = useState({});
  const [queryInput, setQueryInput] = useState("");
  const [queries, setQueries] = useState([]);
  const [googleCategory, setGoogleCategory] = useState("");

  // Характеристики
  const [attrs, setAttrs] = useState([]);
  const ATTR_SUGGEST = {
    "Цвет": ["Черный","Белый","Красный","Синий","Зеленый","Желтый","Серый"],
    "Размер": ["XS","S","M","L","XL","XXL"],
    "Материал": ["Пластик","Металл","Резина","Текстиль","Кожа"],
    "Бренд": []
  };

  // Габариты
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKeys, setSeoKeys] = useState("");
  const [seoSlug, setSeoSlug] = useState("");
  const [seoNoindex, setSeoNoindex] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  /* ===== Черновик ===== */
  useEffect(() => {
    const draft = localStorage.getItem("draftProductV2");
    if (!draft) return;
    try {
      const d = JSON.parse(draft);
      const setters = {
        name: setName, sku: setSku, description: setDescription,
        images: setImages, videoUrl: setVideoUrl,
        priceMode: setPriceMode, retailPrice: setRetailPrice, retailCurrency: setRetailCurrency,
        priceFromFlag: setPriceFromFlag, wholesaleTiers: setWholesaleTiers,
        unit: setUnit, stockState: setStockState, stock: setStock, regions: setRegions,
        visibility: setVisibility,
        groupsTree: setGroupsTree, group: setGroup, queries: setQueries, googleCategory: setGoogleCategory,
        groupExpanded: setGroupExpanded,
        attrs: setAttrs,
        width: setWidth, height: setHeight, length: setLength, weight: setWeight,
        seoTitle: setSeoTitle, seoDesc: setSeoDesc, seoKeys: setSeoKeys, seoSlug: setSeoSlug, seoNoindex: setSeoNoindex
      };
      Object.keys(setters).forEach(k => d[k] !== undefined && setters[k](d[k]));
      setDescLen(textLength(d.description || ""));
    } catch {}
  }, []);

  useEffect(() => {
    const draft = {
      name, sku, description,
      images, videoUrl,
      priceMode, retailPrice, retailCurrency, priceFromFlag, wholesaleTiers,
      unit, stockState, stock, regions,
      visibility,
      groupsTree, group, queries, googleCategory, groupExpanded,
      attrs,
      width, height, length, weight,
      seoTitle, seoDesc, seoKeys, seoSlug, seoNoindex
    };
    localStorage.setItem("draftProductV2", JSON.stringify(draft));
  }, [
    name, sku, description,
    images, videoUrl,
    priceMode, retailPrice, retailCurrency, priceFromFlag, wholesaleTiers,
    unit, stockState, stock, regions,
    visibility,
    groupsTree, group, queries, googleCategory, groupExpanded,
    attrs,
    width, height, length, weight,
    seoTitle, seoDesc, seoKeys, seoSlug, seoNoindex
  ]);

  /* ===== Дерево групп ===== */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/groups/tree");
        setGroupsTree(data || []);
      } catch (e) {
        console.error("groups tree error", e);
      }
    })();
  }, []);

  /* ===== Ограничители ===== */
  const onChangeName = (v) => setName(v.slice(0, NAME_MAX));
  const onChangeSku = (v) => setSku(v.slice(0, SKU_MAX));
  const onChangeDescription = (val) => {
    const len = textLength(val);
    if (len <= DESC_MAX) { setDescription(val); setDescLen(len); }
  };

  /* ===== Фото ===== */
  const onImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => {
      const prevFiles = prev.map(i => i.file).filter(Boolean);
      const all = [...prevFiles, ...files];
      const seen = new Set();
      const uniq = [];
      for (const f of all) {
        const key = f.name + "_" + f.size;
        if (!seen.has(key)) { seen.add(key); uniq.push({ id: genId(), file: f, url: URL.createObjectURL(f) }); }
      }
      return uniq.slice(0, MAX_IMAGES);
    });
    if (inputFileRef.current) inputFileRef.current.value = null;
  };
  const removeImage = (id) => setImages(p => p.filter(i => i.id !== id));

  /* ===== Видео (одно) ===== */
  const onVideoFile = (e) => {
    const f = (e.target.files || [])[0];
    setVideoFile(f || null);
    setVideoUrl("");
  };
  const onVideoUrl = (v) => {
    setVideoUrl(v.trim());
    if (v.trim()) setVideoFile(null);
  };

  /* ===== Поисковые запросы ===== */
  const onQueryKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = queryInput.trim();
      if (val && !queries.includes(val)) {
        setQueries([...queries, val]);
        setQueryInput("");
      }
    }
  };
  const removeQuery = (val) => setQueries(queries.filter(q => q !== val));

  /* ===== Дерево групп helpers (обновлено на chevron) ===== */
  const toggleExpand = (id) => setGroupExpanded(s => ({ ...s, [id]: !s[id] }));
  const renderTree = (arr) => {
    return (arr || []).map((g) => {
      const hasChildren = g.children && g.children.length > 0;
      const expanded = !!groupExpanded[g._id];
      return (
        <div className="tree-node" key={g._id}>
          <div className="tree-row">
            {hasChildren ? (
              <span
                className={`chev-tree ${expanded ? "open" : ""}`}
                onClick={() => toggleExpand(g._id)}
              />
            ) : (
              <span className="chev-tree spacer" />
            )}
            <label className="radio-row">
              <input
                type="radio"
                name="groupPick"
                checked={group === g._id}
                onChange={() => setGroup(g._id)}
              />
              <span className="gname">{g.name}</span>
              {typeof g.count === "number" && <span className="gcount">({g.count})</span>}
            </label>
          </div>
          {hasChildren && expanded && (
            <div className="tree-children">
              {renderTree(g.children)}
            </div>
          )}
        </div>
      );
    });
  };

  /* ===== Характеристики ===== */
  const addAttr = () => setAttrs(p => [...p, { id: genId(), key: "", value: "" }]);
  const removeAttr = (id) => setAttrs(p => p.filter(a => a.id !== id));
  const updateAttr = (id, field, val) => {
    setAttrs(p => p.map(a => a.id === id ? { ...a, [field]: val } : a));
  };

  /* ===== Оптовые ступени ===== */
  const addWholesale = () => {
    setWholesaleTiers(p => [...p, { id: genId(), price: "", currency: (p[0]?.currency || "UAH"), minQty: "" }]);
  };
  const updateWholesale = (id, patch) => {
    setWholesaleTiers(p => p.map(t => t.id === id ? { ...t, ...patch } : t));
  };
  const removeWholesale = (id) => {
    setWholesaleTiers(p => p.filter(t => t.id !== id));
  };

  /* ===== Submit ===== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!name.trim()) { alert("Введите название"); return; }
    if (!group) { alert("Выберите группу"); return; }

    const fd = new FormData();

    // Основное
    fd.append("name", name.trim());
    fd.append("sku", sku.trim());
    fd.append("description", description);

    // Медиа
    images.forEach(img => img.file && fd.append("images", img.file));
    if (videoFile) fd.append("video", videoFile);
    if (videoUrl) fd.append("videoUrl", videoUrl);

    // Цена и наличие (новая модель)
    fd.append("priceMode", priceMode);
    fd.append("retailPrice", retailPrice);
    fd.append("retailCurrency", retailCurrency);
    fd.append("priceFromFlag", priceFromFlag ? "1" : "0");
    fd.append("wholesaleTiers", JSON.stringify(wholesaleTiers));
    fd.append("unit", unit);
    fd.append("stockState", stockState);
    fd.append("stock", stock);
    fd.append("regions", JSON.stringify(regions));

    // Публикация
    fd.append("availability", visibility);

    // Размещение
    fd.append("group", group);
    fd.append("queries", JSON.stringify(queries));
    fd.append("googleCategory", googleCategory);

    // Характеристики
    fd.append("attrs", JSON.stringify(attrs.filter(a => a.key && a.value)));

    // Габариты
    fd.append("width", width);
    fd.append("height", height);
    fd.append("length", length);
    fd.append("weight", weight);

    // SEO
    fd.append("seoTitle", seoTitle || name.trim());
    fd.append("seoDesc", seoDesc);
    fd.append("seoKeys", seoKeys);
    fd.append("seoSlug", seoSlug);
    fd.append("seoNoindex", seoNoindex ? "1" : "0");

    try {
      setIsSaving(true);
      await api.post("/api/products", fd);
      localStorage.removeItem("draftProductV2");
      navigate("/admin/products");
    } catch (err) {
      alert("Ошибка сохранения: " + (err?.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="add-prod products-page">
      <AdminSubMenu type="products" activeKey="create" />

      <div className="addprod-topbar">
        <button className="btn-ghost" onClick={() => navigate("/admin/products")}>← Назад</button>
        <button type="submit" form="add-prod-form" disabled={isSaving} className="btn-primary">
          {isSaving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>

      <form id="add-prod-form" className="addprod-form" onSubmit={handleSubmit}>
        <div className="layout-grid">

          {/* ===== ЛЕВАЯ КОЛОНКА ===== */}
          <div className="main-col">

            {/* Основная информация */}
            <div className="card">
              <div className="card-title">Основная информация</div>

              <div className="form-row two">
                <div className="field-col">
                  <label>Название <span className="muted">({name.length}/{NAME_MAX})</span></label>
                  <input
                    value={name}
                    onChange={(e) => onChangeName(e.target.value)}
                    placeholder="Название товара"
                  />
                </div>
                <div className="field-col">
                  <label>Код / Артикул <span className="muted">({sku.length}/{SKU_MAX})</span></label>
                  <input
                    value={sku}
                    onChange={(e) => onChangeSku(e.target.value)}
                    placeholder="Артикул"
                  />
                </div>
              </div>

              <div className="field-col">
                <label>Описание <span className="muted">({descLen}/{DESC_MAX})</span></label>
                <LocalEditor value={description} onChange={onChangeDescription} placeholder="Описание товара..." />
              </div>

              <div className="media-block">
                <div className="field-col">
                  <label>Фото <span className="muted">(до {MAX_IMAGES})</span></label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={inputFileRef}
                    style={{ display: "none" }}
                    onChange={onImagesChange}
                  />
                  <div className="media-grid media-grid--compact">
                    {images.length === 0 && (
                      <>
                        <div className="thumb add" onClick={() => inputFileRef.current?.click()}>+</div>
                        {Array.from({ length: MAX_IMAGES - 1 }).map((_, i) => (
                          <div key={`empty-${i}`} className="thumb add" onClick={() => inputFileRef.current?.click()}>+</div>
                        ))}
                      </>
                    )}
                    {images.length > 0 && (
                      <>
                        {images.map(img => (
                          <div className="thumb" key={img.id}>
                            <img src={img.url} alt="" />
                            <button type="button" onClick={() => removeImage(img.id)}>×</button>
                          </div>
                        ))}
                        {Array.from({ length: Math.max(0, MAX_IMAGES - images.length) }).map((_, i) => (
                          <div key={`more-${i}`} className="thumb add" onClick={() => inputFileRef.current?.click()}>+</div>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="add-by-link" onClick={() => inputFileRef.current?.click()}>Добавить фото</div>
                </div>

                <div className="field-col">
                  <label style={{ gap: 8, display: "flex", alignItems: "center" }}>
                    Видео <PlayBadge /> <span className="muted">(одно)</span>
                  </label>
                  <div className="video-row">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => onVideoUrl(e.target.value)}
                      placeholder="Ссылка на YouTube/Vimeo (если есть)"
                    />
                    <input
                      type="file"
                      accept="video/*"
                      ref={inputVideoRef}
                      onChange={onVideoFile}
                    />
                  </div>
                  {(videoUrl || videoFile) && (
                    <div className="video-preview">
                      <PlayBadge size={18} />
                      {videoUrl ? (
                        <span className="muted">Ссылка указана</span>
                      ) : (
                        <span className="muted">{videoFile?.name}</span>
                      )}
                      <button
                        type="button"
                        className="btn-mini"
                        onClick={() => { setVideoUrl(""); setVideoFile(null); if (inputVideoRef.current) inputVideoRef.current.value = ""; }}
                      >Очистить</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Цена и наличие — ПЕРЕДЕЛАНО */}
            <div className="card">
              <div className="card-title">Цена и наличие</div>

              <div className="inline-radios">
                <label><input type="radio" name="pm" checked={priceMode==="retail"} onChange={()=>setPriceMode("retail")} /> Розница</label>
                <label><input type="radio" name="pm" checked={priceMode==="wholesale"} onChange={()=>setPriceMode("wholesale")} /> Только опт</label>
                <label><input type="radio" name="pm" checked={priceMode==="both"} onChange={()=>setPriceMode("both")} /> Оптом и в розницу</label>
                <label><input type="radio" name="pm" checked={priceMode==="service"} onChange={()=>setPriceMode("service")} /> Услуга</label>
              </div>

              {/* ——— РОЗНИЦА ——— */}
              {(priceMode === "retail") && (
                <>
                  <div className="price-grid">
                    <div className="field-col">
                      <label>Розничная цена</label>
                      <PriceWithCurrency
                        value={retailPrice}
                        currency={retailCurrency}
                        onChangeValue={setRetailPrice}
                        onChangeCurrency={setRetailCurrency}
                      />
                    </div>

                    <div className="field-col">
                      <label>Единица</label>
                      <select value={unit} onChange={(e)=>setUnit(e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}.</option>)}
                      </select>
                    </div>

                    <div className="field-col">
                      <label>Наличие</label>
                      <select value={stockState} onChange={(e)=>setStockState(e.target.value)}>
                        <option value="in_stock">В наличии</option>
                        <option value="preorder">Под заказ</option>
                        <option value="out">Нет в наличии</option>
                      </select>
                    </div>

                    <div className="field-col">
                      <label>Остатки</label>
                      <input value={stock} onChange={(e)=>setStock(e.target.value)} placeholder="-" />
                    </div>

                    <div className="field-col col-span-2">
                      <label>Где находится товар</label>
                      <RegionMultiSelect
                        options={UA_REGIONS}
                        value={regions}
                        onChange={setRegions}
                        placeholder="Выберите регионы"
                      />
                    </div>
                  </div>

                  <label className="checkline mt8">
                    <input type="checkbox" checked={priceFromFlag} onChange={e=>setPriceFromFlag(e.target.checked)} />
                    Установить «цена от»
                  </label>
                </>
              )}

              {/* ——— ТОЛЬКО ОПТ ——— */}
              {(priceMode === "wholesale") && (
                <>
                  <div className="price-grid">
                    <div className="field-col">
                      <label>Наличие</label>
                      <select value={stockState} onChange={(e)=>setStockState(e.target.value)}>
                        <option value="in_stock">В наличии</option>
                        <option value="preorder">Под заказ</option>
                        <option value="out">Нет в наличии</option>
                      </select>
                    </div>
                    <div className="field-col">
                      <label>Остатки</label>
                      <input value={stock} onChange={(e)=>setStock(e.target.value)} placeholder="-" />
                    </div>
                    <div className="field-col">
                      <label>Единица</label>
                      <select value={unit} onChange={(e)=>setUnit(e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}.</option>)}
                      </select>
                    </div>
                    <div className="field-col col-span-2">
                      <label>Где находится товар</label>
                      <RegionMultiSelect options={UA_REGIONS} value={regions} onChange={setRegions} placeholder="Выберите регионы" />
                    </div>
                  </div>

                  {wholesaleTiers.map((t, idx) => (
                    <div className="wh-row" key={t.id}>
                      <div className="field-col">
                        <label>Оптовая цена</label>
                        <PriceWithCurrency
                          value={t.price}
                          currency={t.currency}
                          onChangeValue={(v)=>updateWholesale(t.id, { price: v })}
                          onChangeCurrency={(v)=>updateWholesale(t.id, { currency: v })}
                        />
                      </div>
                      <div className="field-col">
                        <label>При заказе от</label>
                        <div className="input-merge">
                          <input type="number" value={t.minQty} onChange={e=>updateWholesale(t.id, { minQty: e.target.value })} placeholder="0" />
                          <div className="addon">{unit}.</div>
                        </div>
                      </div>
                      {idx>0 && (
                        <button type="button" className="btn-ghost danger self-end" onClick={()=>removeWholesale(t.id)}>Удалить</button>
                      )}
                    </div>
                  ))}

                  <div className="mt6">
                    <button type="button" className="btn-link" onClick={addWholesale}>+ Добавить оптовую цену</button>
                  </div>

                  <label className="checkline mt8">
                    <input type="checkbox" checked={priceFromFlag} onChange={e=>setPriceFromFlag(e.target.checked)} />
                    Установить «цена от»
                  </label>
                </>
              )}

              {/* ——— ОПТОМ И В РОЗНИЦУ ——— */}
              {(priceMode === "both") && (
                <>
                  <div className="price-grid">
                    <div className="field-col">
                      <label>Розничная цена</label>
                      <PriceWithCurrency
                        value={retailPrice}
                        currency={retailCurrency}
                        onChangeValue={setRetailPrice}
                        onChangeCurrency={setRetailCurrency}
                      />
                    </div>
                    <div className="field-col">
                      <label>Единица</label>
                      <select value={unit} onChange={(e)=>setUnit(e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}.</option>)}
                      </select>
                    </div>
                    <div className="field-col">
                      <label>Наличие</label>
                      <select value={stockState} onChange={(e)=>setStockState(e.target.value)}>
                        <option value="in_stock">В наличии</option>
                        <option value="preorder">Под заказ</option>
                        <option value="out">Нет в наличии</option>
                      </select>
                    </div>
                    <div className="field-col">
                      <label>Остатки</label>
                      <input value={stock} onChange={(e)=>setStock(e.target.value)} placeholder="-" />
                    </div>
                  </div>

                  {wholesaleTiers.map((t, idx) => (
                    <div className="wh-row" key={t.id}>
                      <div className="field-col">
                        <label>Оптовая цена</label>
                        <PriceWithCurrency
                          value={t.price}
                          currency={t.currency}
                          onChangeValue={(v)=>updateWholesale(t.id, { price: v })}
                          onChangeCurrency={(v)=>updateWholesale(t.id, { currency: v })}
                        />
                      </div>
                      <div className="field-col">
                        <label>При заказе от</label>
                        <div className="input-merge">
                          <input type="number" value={t.minQty} onChange={e=>updateWholesale(t.id, { minQty: e.target.value })} placeholder="0" />
                          <div className="addon">{unit}.</div>
                        </div>
                      </div>
                      {idx>0 && (
                        <button type="button" className="btn-ghost danger self-end" onClick={()=>removeWholesale(t.id)}>Удалить</button>
                      )}
                    </div>
                  ))}

                  <div className="mt6">
                    <button type="button" className="btn-link" onClick={addWholesale}>+ Добавить оптовую цену</button>
                  </div>

                  <div className="form-row">
                    <div className="field-col">
                      <label>Где находится товар</label>
                      <RegionMultiSelect options={UA_REGIONS} value={regions} onChange={setRegions} placeholder="Выберите регионы" />
                    </div>
                  </div>

                  <label className="checkline mt8">
                    <input type="checkbox" checked={priceFromFlag} onChange={e=>setPriceFromFlag(e.target.checked)} />
                    Установить «цена от»
                  </label>
                </>
              )}

              {/* ——— УСЛУГА ——— */}
              {(priceMode === "service") && (
                <>
                  <div className="price-grid">
                    <div className="field-col">
                      <label>Цена</label>
                      <PriceWithCurrency
                        value={retailPrice}
                        currency={retailCurrency}
                        onChangeValue={setRetailPrice}
                        onChangeCurrency={setRetailCurrency}
                      />
                    </div>
                    <div className="field-col">
                      <label>Единица</label>
                      <select value={unit} onChange={(e)=>setUnit(e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}.</option>)}
                      </select>
                    </div>
                    <div className="field-col col-span-2">
                      <label>Где находится товар</label>
                      <RegionMultiSelect options={UA_REGIONS} value={regions} onChange={setRegions} placeholder="Выберите регионы" />
                    </div>
                  </div>

                  <label className="checkline mt8">
                    <input type="checkbox" checked={priceFromFlag} onChange={e=>setPriceFromFlag(e.target.checked)} />
                    Установить «цена от»
                  </label>
                </>
              )}

              <div className="seg mt14">
                <label>Видимость</label>
                <div className="seg-items">
                  <button type="button" className={visibility === "published" ? "active" : ""} onClick={() => setVisibility("published")}>Опубликовать</button>
                  <button type="button" className={visibility === "hidden" ? "active" : ""} onClick={() => setVisibility("hidden")}>Скрыть</button>
                </div>
              </div>
            </div>

            {/* Характеристики */}
            <div className="card">
              <div className="card-title">Характеристики</div>

              {attrs.map((a) => (
                <div className="attr-row" key={a.id}>
                  <div className="field-col">
                    <label>Характеристика</label>
                    <input
                      list={`attr-keys-${a.id}`}
                      value={a.key}
                      onChange={(e) => updateAttr(a.id, "key", e.target.value)}
                      placeholder="Напр. Цвет"
                    />
                    <datalist id={`attr-keys-${a.id}`}>
                      {Object.keys(ATTR_SUGGEST).map(k => <option key={k} value={k} />)}
                    </datalist>
                  </div>

                  <div className="field-col">
                    <label>Значение</label>
                    <input
                      list={`attr-values-${a.id}`}
                      value={a.value}
                      onChange={(e) => updateAttr(a.id, "value", e.target.value)}
                      placeholder="Напр. Зеленый"
                    />
                    <datalist id={`attr-values-${a.id}`}>
                      {(ATTR_SUGGEST[a.key] || []).map(v => <option key={v} value={v} />)}
                    </datalist>
                  </div>

                  <button type="button" className="btn-ghost danger" onClick={() => removeAttr(a.id)}>Удалить</button>
                </div>
              ))}

              <div>
                <button type="button" className="btn-outline" onClick={addAttr}>+ Добавить характеристику</button>
              </div>
            </div>

            {/* Габариты */}
            <div className="card">
              <div className="card-title">Габариты</div>
              <div className="form-row four">
                <div className="field-col">
                  <label>Ширина</label>
                  <input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Ширина" />
                </div>
                <div className="field-col">
                  <label>Высота</label>
                  <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Высота" />
                </div>
                <div className="field-col">
                  <label>Длина</label>
                  <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="Длина" />
                </div>
                <div className="field-col">
                  <label>Вес</label>
                  <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Вес" />
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="card">
              <div className="card-title">SEO</div>
              <div className="form-row two">
                <div className="field-col">
                  <label>Title</label>
                  <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Title страницы товара" />
                </div>
                <div className="field-col">
                  <label>Slug (ЧПУ)</label>
                  <input value={seoSlug} onChange={(e) => setSeoSlug(e.target.value)} placeholder="nasos-mantga-011-0200" />
                </div>
              </div>
              <div className="form-row">
                <label>Description</label>
                <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} placeholder="Краткое описание для meta-description" />
              </div>
              <div className="form-row two">
                <div className="field-col">
                  <label>Keywords</label>
                  <input value={seoKeys} onChange={(e) => setSeoKeys(e.target.value)} placeholder="ключевые слова через запятую" />
                </div>
                <label className="checkline">
                  <input type="checkbox" checked={seoNoindex} onChange={(e) => setSeoNoindex(e.target.checked)} />
                  Не индексировать (noindex, nofollow)
                </label>
              </div>
            </div>
          </div>

          {/* ===== ПРАВАЯ КОЛОНКА ===== */}
          <div className="side-col">

            {/* Размещение: группы (дерево) */}
            <div className="card">
              <div className="card-title">Размещение — Группы</div>
              <div className="tree-wrap">
                {groupsTree.length ? renderTree(groupsTree) : <div className="muted">Загрузка дерева…</div>}
              </div>
            </div>

            {/* Поисковые запросы */}
            <div className="card">
              <div className="card-title">Поисковые запросы для сайта</div>
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={onQueryKeyDown}
                placeholder="Введите запрос и нажмите Enter"
              />
              <div className="chips">
                {queries.map((q, i) => (
                  <span key={i} className="chip">{q}<b onClick={() => removeQuery(q)}>×</b></span>
                ))}
              </div>
            </div>

            {/* Категория для Google */}
            <div className="card">
              <div className="card-title">Категория товара для Google</div>
              <AsyncGoogleCategorySelect
                value={googleCategory}
                onChange={setGoogleCategory}
                lang="ru-RU"
              />
              <div className="help">Поиск по полной таксономии Google. Сохраняем ID категории.</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

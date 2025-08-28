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

// утилита для подсчёта длины текстового содержимого LocalEditor (html → text)
const textLength = (html) => {
  if (!html) return 0;
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").trim().length;
};

export default function AdminAddProductPage() {
  const navigate = useNavigate();

  /* ======================= СТЕЙТ ======================= */
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

  // Цена и наличие
  const [priceType, setPriceType] = useState("retail"); // retail|wholesale
  const [currency, setCurrency] = useState("UAH"); // UAH|USD|EUR
  const [priceOld, setPriceOld] = useState("");
  const [priceNew, setPriceNew] = useState("");
  const [priceTimerOn, setPriceTimerOn] = useState(false);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [isPromo, setIsPromo] = useState(false);
  const [unit, setUnit] = useState("шт");
  const [serviceCity, setServiceCity] = useState("");
  const [stock, setStock] = useState("");
  const [visibility, setVisibility] = useState("published"); // published|hidden

  // Размещение
  const [groupsTree, setGroupsTree] = useState([]);
  const [group, setGroup] = useState(""); // выбранная группа (id)
  const [groupExpanded, setGroupExpanded] = useState({}); // раскрытие в дереве

  const [queryInput, setQueryInput] = useState("");
  const [queries, setQueries] = useState([]);

  const [googleCategory, setGoogleCategory] = useState(""); // ID таксономии Google

  // Характеристики (динамические)
  const [attrs, setAttrs] = useState([
    // { id, key: "Цвет", value: "Зеленый" }
  ]);
  // демо-набор подсказок (расширишь с сервера при желании)
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

  // Прочее
  const [isSaving, setIsSaving] = useState(false);

  /* =================== АВТОСОХРАНЕНИЕ =================== */
  useEffect(() => {
    const draft = localStorage.getItem("draftProductV2");
    if (!draft) return;
    try {
      const d = JSON.parse(draft);
      // просто перебираем ключи, если есть — ставим
      const setters = {
        // основное
        name: setName, sku: setSku, description: setDescription,
        // медиа
        images: setImages, videoUrl: setVideoUrl,
        // цена
        priceType: setPriceType, currency: setCurrency,
        priceOld: setPriceOld, priceNew: setPriceNew,
        priceTimerOn: setPriceTimerOn, priceFrom: setPriceFrom, priceTo: setPriceTo, isPromo: setIsPromo,
        unit: setUnit, serviceCity: setServiceCity,
        stock: setStock, visibility: setVisibility,
        // размещение
        groupsTree: setGroupsTree, group: setGroup, queries: setQueries, googleCategory: setGoogleCategory,
        groupExpanded: setGroupExpanded,
        // характеристики
        attrs: setAttrs,
        // габариты
        width: setWidth, height: setHeight, length: setLength, weight: setWeight,
        // SEO
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
      priceType, currency, priceOld, priceNew, priceTimerOn, priceFrom, priceTo, isPromo,
      unit, serviceCity, stock, visibility,
      groupsTree, group, queries, googleCategory, groupExpanded,
      attrs,
      width, height, length, weight,
      seoTitle, seoDesc, seoKeys, seoSlug, seoNoindex
    };
    localStorage.setItem("draftProductV2", JSON.stringify(draft));
  }, [
    name, sku, description,
    images, videoUrl,
    priceType, currency, priceOld, priceNew, priceTimerOn, priceFrom, priceTo, isPromo,
    unit, serviceCity, stock, visibility,
    groupsTree, group, queries, googleCategory, groupExpanded,
    attrs,
    width, height, length, weight,
    seoTitle, seoDesc, seoKeys, seoSlug, seoNoindex
  ]);

  /* ==================== ДАННЫЕ ГРУПП ==================== */
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

  /* ==================== ХЕЛПЕРЫ ==================== */
  // Ограничение длины для Name / SKU
  const onChangeName = (v) => setName(v.slice(0, NAME_MAX));
  const onChangeSku = (v) => setSku(v.slice(0, SKU_MAX));
  // LocalEditor: ограничиваем по тексту
  const onChangeDescription = (val) => {
    const len = textLength(val);
    if (len <= DESC_MAX) { setDescription(val); setDescLen(len); }
  };

  // Медиа: фото (до 10)
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

  // Медиа: видео (только 1 — либо ссылка, либо файл)
  const onVideoFile = (e) => {
    const f = (e.target.files || [])[0];
    setVideoFile(f || null);
    setVideoUrl(""); // если файл выбран — ссылку чистим
  };
  const onVideoUrl = (v) => {
    setVideoUrl(v.trim());
    if (v.trim()) setVideoFile(null); // если ссылка — файл чистим
  };

  // Поисковые запросы (чипсы)
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

  // Дерево групп
  const toggleExpand = (id) => setGroupExpanded(s => ({ ...s, [id]: !s[id] }));
  const renderTree = (arr, level = 0) => {
    return (arr || []).map((g) => {
      const hasChildren = (g.children && g.children.length > 0);
      const expanded = !!groupExpanded[g._id];
      return (
        <div className="tree-node" key={g._id} style={{ marginLeft: level * 14 }}>
          <div className="tree-row">
            {hasChildren ? (
              <span className={`twisty ${expanded ? "open" : ""}`} onClick={() => toggleExpand(g._id)} />
            ) : <span className="twisty placeholder" />}
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
              {renderTree(g.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Характеристики
  const addAttr = () => setAttrs(p => [...p, { id: genId(), key: "", value: "" }]);
  const removeAttr = (id) => setAttrs(p => p.filter(a => a.id !== id));
  const updateAttr = (id, field, val) => {
    setAttrs(p => p.map(a => a.id === id ? { ...a, [field]: val } : a));
  };

  /* ==================== SUBMIT ==================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    // простые проверки
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

    // Цена и наличие
    fd.append("priceType", priceType);
    fd.append("currency", currency);
    fd.append("priceOld", priceOld);
    fd.append("priceNew", priceNew);
    fd.append("priceTimerOn", priceTimerOn ? "1" : "0");
    fd.append("priceFrom", priceFrom || "");
    fd.append("priceTo", priceTo || "");
    fd.append("isPromo", isPromo ? "1" : "0");

    fd.append("unit", unit);
    fd.append("serviceCity", serviceCity);
    fd.append("stock", stock);

    fd.append("availability", visibility); // published|hidden

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

  /* ==================== UI ==================== */
  const isService = unit === "услуга";

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

          {/* ====== ЛЕВАЯ КОЛОНКА (основные блоки) ====== */}
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
                  <div className="media-grid">
                    {/* пусто */}
                    {images.length === 0 && (
                      <>
                        <div className="thumb add" onClick={() => inputFileRef.current?.click()}>+</div>
                        {Array.from({ length: MAX_IMAGES - 1 }).map((_, i) => (
                          <div key={`empty-${i}`} className="thumb add" onClick={() => inputFileRef.current?.click()}>+</div>
                        ))}
                      </>
                    )}
                    {/* с фото */}
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
                  <label>Видео <span className="muted">(одно)</span></label>
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

            {/* Цена и наличие */}
            <div className="card">
              <div className="card-title">Цена и наличие</div>

              <div className="seg">
                <label>Тип цены</label>
                <div className="seg-items">
                  <button type="button" className={priceType === "retail" ? "active" : ""} onClick={() => setPriceType("retail")}>Розница</button>
                  <button type="button" className={priceType === "wholesale" ? "active" : ""} onClick={() => setPriceType("wholesale")}>Опт</button>
                </div>
              </div>

              <div className="form-row three">
                <div className="field-col">
                  <label>Старая цена</label>
                  <input type="number" value={priceOld} onChange={(e) => setPriceOld(e.target.value)} placeholder="0" />
                </div>
                <div className="field-col">
                  <label>Новая цена</label>
                  <input type="number" value={priceNew} onChange={(e) => setPriceNew(e.target.value)} placeholder="0" />
                </div>
                <div className="field-col">
                  <label>Валюта</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="UAH">Грн</option>
                    <option value="USD">Доллар</option>
                    <option value="EUR">Евро</option>
                  </select>
                </div>
              </div>

              <div className="form-row two">
                <label className="checkline">
                  <input type="checkbox" checked={isPromo} onChange={(e) => setIsPromo(e.target.checked)} />
                  Пометить как акцию
                </label>
                <label className="checkline">
                  <input type="checkbox" checked={priceTimerOn} onChange={(e) => setPriceTimerOn(e.target.checked)} />
                  Включить таймер цены
                </label>
              </div>

              {priceTimerOn && (
                <div className="form-row two">
                  <div className="field-col">
                    <label>Цена действует с</label>
                    <input type="datetime-local" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />
                  </div>
                  <div className="field-col">
                    <label>до</label>
                    <input type="datetime-local" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="form-row three">
                <div className="field-col">
                  <label>Единица измерения</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                {isService && (
                  <div className="field-col">
                    <label>Город (для услуги)</label>
                    <input value={serviceCity} onChange={(e) => setServiceCity(e.target.value)} placeholder="Киев / Львов / Одесса…" />
                  </div>
                )}
                <div className="field-col">
                  <label>Остаток</label>
                  <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Количество на складе" />
                </div>
              </div>

              <div className="seg">
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
                    {/* подсказки по ключам */}
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
                    {/* подсказки по значениям */}
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

          {/* ====== ПРАВАЯ КОЛОНКА (размещение и прочее) ====== */}
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

// frontend/src/admin/AdminEditProductPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LocalEditor from "../components/LocalEditor";
import AdminSubMenu from "./AdminSubMenu";
import AsyncGoogleCategorySelect from "../components/AsyncGoogleCategorySelect";
import api from "../utils/api.js";
import "../assets/AdminPanel.css";
import "../assets/AdminAddProductPage.css";

const genId = () => Math.random().toString(36).slice(2) + Date.now();
const MAX_IMAGES = 10;
const NAME_MAX = 120;
const SKU_MAX = 64;
const DESC_MAX = 5000;

const UNITS = [
  "шт","комплект","упаковка","пара","коробка","рулон",
  "кг","г","т","л","мл",
  "м","см","мм","м²","м³",
  "час","день","месяц","год",
  "услуга"
];

const STOCK_STATES = [
  { value: "in_stock", label: "В наличии" },
  { value: "preorder", label: "Под заказ" },
  { value: "out", label: "Нет в наличии" },
];

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

const textLength = (html) => {
  if (!html) return 0;
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").trim().length;
};

/* ---- мини-иконка для дерева ---- */
function PlayBadge({ size = 18, open = false }) {
  return (
    <span className={`play-badge ${open ? "open" : ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

/* ===================== БЛОК ЦЕНЫ ===================== */
function PriceBox({
  price, currency, unit, stock, stockState,
  onPriceChange, onCurrencyChange, onUnitChange, onStockChange, onStockStateChange,
  blockBadKeys
}) {
  return (
    <div className="card price-box">
      <div className="card-title">Цена</div>

      <div className="price-inline">
        {/* Цена + валюта */}
        <div className="input-merge--fluid">
          <input
            className="price-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={price}
            onChange={onPriceChange}
            onKeyDown={blockBadKeys}
            placeholder="0"
            aria-label="Цена"
          />
          <div className="select-wrap currency-wrap">
            <select value={currency} onChange={(e) => onCurrencyChange(e.target.value)} aria-label="Валюта">
              <option value="UAH">₴</option>
              <option value="USD">$</option>
              <option value="EUR">€</option>
            </select>
          </div>
        </div>

        {/* Единица */}
        <div className="select-wrap unit-wrap">
          <select value={unit} onChange={(e)=>onUnitChange(e.target.value)} aria-label="Единица измерения">
            {UNITS.map(u => <option key={u} value={u}>{u}.</option>)}
          </select>
        </div>

        {/* Остаток */}
        <input
          className="stock-input"
          type="text"
          value={stock}
          onChange={(e)=>onStockChange(e.target.value)}
          placeholder="-"
          autoComplete="off"
          aria-label="Остаток"
        />

        {/* Наличие */}
        <div className="select-wrap status-wrap">
          <select
            value={stockState}
            onChange={(e)=>onStockStateChange(e.target.value)}
            aria-label="Наличие"
          >
            {STOCK_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function AdminEditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Основная информация
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [descLen, setDescLen] = useState(0);

  // Медиа
  const [images, setImages] = useState([]); // [{id, url, file?, serverUrl?}]
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const inputFileRef = useRef(null);
  const inputVideoRef = useRef(null);

  // Цена (retail)
  const [price, setPrice] = useState("");            // retailPrice (строка в инпуте)
  const [currency, setCurrency] = useState("UAH");   // retailCurrency
  const [unit, setUnit] = useState("шт");
  const [stock, setStock] = useState("");
  const [stockState, setStockState] = useState("in_stock");

  // Публикация
  const [visibility, setVisibility] = useState("published");

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

  /* ----- грузим дерево групп ----- */
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

  /* ----- грузим товар ----- */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: prod } = await api.get(`/api/products/${id}`);

        setName(prod?.name || "");
        setSku(prod?.sku || "");
        setDescription(prod?.description || "");
        setDescLen(textLength(prod?.description || ""));

        // Группа
        setGroup(typeof prod?.group === "object" ? prod.group?._id || "" : prod?.group || "");

        // Цена/склад — учитываем новую схему и возможные старые поля
        const priceFromSchema = prod?.retailPrice ?? prod?.price;
        setPrice(priceFromSchema !== undefined && priceFromSchema !== null ? String(priceFromSchema) : "");
        setCurrency(prod?.retailCurrency || prod?.currency || "UAH");
        setUnit(prod?.unit || "шт");
        setStock(String(prod?.stock ?? ""));
        setStockState(prod?.stockState || "in_stock");

        // Видимость
        setVisibility(prod?.availability || "published");

        // Поисковые запросы
        if (Array.isArray(prod?.queries)) setQueries(prod.queries);
        else if (typeof prod?.queries === "string") {
          const arr = prod.queries.split(",").map(s => s.trim()).filter(Boolean);
          setQueries(arr);
        } else setQueries([]);

        // Google category
        setGoogleCategory(prod?.googleCategory || "");

        // Атрибуты
        if (Array.isArray(prod?.attrs)) {
          setAttrs(prod.attrs.map(a => ({ id: genId(), key: a.key || "", value: a.value || "" })));
        }

        // Габариты
        setWidth(String(prod?.width ?? ""));
        setHeight(String(prod?.height ?? ""));
        setLength(String(prod?.length ?? ""));
        setWeight(String(prod?.weight ?? ""));

        // SEO
        setSeoTitle(prod?.seoTitle || "");
        setSeoDesc(prod?.seoDesc || "");
        setSeoKeys(prod?.seoKeys || "");
        setSeoSlug(prod?.seoSlug || "");
        setSeoNoindex(!!prod?.seoNoindex);

        // Видео
        setVideoUrl(prod?.videoUrl || "");

        // Картинки
        const serverImages = (prod?.images || []).map((url, i) => {
          const abs = url?.startsWith("http") ? url : `${BASE_URL}${url}`;
          return { id: "srv" + i, file: null, url: abs, serverUrl: url };
        });
        setImages(serverImages.slice(0, MAX_IMAGES));
      } catch (e) {
        console.error(e);
        navigate("/admin/products");
      }
    })();
  }, [id, navigate]);

  /* ----- Ограничители ----- */
  const onChangeDescription = (val) => {
    const len = textLength(val);
    if (len <= DESC_MAX) { setDescription(val); setDescLen(len); }
  };

  /* ----- Фото ----- */
  const onImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => {
      const existing = prev.filter(x => x.serverUrl); // уже на сервере
      const seen = new Set(prev.filter(x => x.file).map(f => `${f.file?.name}_${f.file?.size}`));
      const nextFiles = [];
      for (const f of files) {
        const key = `${f.name}_${f.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          nextFiles.push({ id: genId(), file: f, url: URL.createObjectURL(f) });
        }
      }
      return [...existing, ...nextFiles].slice(0, MAX_IMAGES);
    });
    if (inputFileRef.current) inputFileRef.current.value = null;
  };
  const removeImage = (id) => setImages(p => {
    const img = p.find(i => i.id === id);
    if (img?.file && img.url?.startsWith("blob:")) URL.revokeObjectURL(img.url);
    return p.filter(i => i.id !== id);
  });

  /* ----- Видео ----- */
  const onVideoFile = (e) => {
    const f = (e.target.files || [])[0];
    setVideoFile(f || null);
    setVideoUrl("");
  };
  const onVideoUrl = (v) => {
    setVideoUrl(v.trim());
    if (v.trim()) setVideoFile(null);
  };

  /* ----- Поисковые запросы (chips) ----- */
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

  /* ----- Дерево helpers ----- */
  const toggleExpand = (id) => setGroupExpanded(s => ({ ...s, [id]: !s[id] }));
  const renderTree = (arr) => (arr || []).map((g) => {
    const hasChildren = g.children && g.children.length > 0;
    const expanded = !!groupExpanded[g._id];
    return (
      <div className="tree-node" key={g._id}>
        <div className="tree-row">
          {hasChildren ? (
            <button type="button" className="play-toggle" onClick={() => toggleExpand(g._id)} aria-label={expanded ? "Свернуть" : "Развернуть"}>
              <PlayBadge size={18} open={expanded} />
            </button>
          ) : (<span className="play-toggle spacer" />)}
          <label className="radio-row">
            <input type="radio" name="groupPick" checked={group === g._id} onChange={() => setGroup(g._id)} />
            <span className="gname">{g.name}</span>
            {typeof g.count === "number" && <span className="gcount">({g.count})</span>}
          </label>
        </div>
        {hasChildren && expanded && <div className="tree-children">{renderTree(g.children)}</div>}
      </div>
    );
  });

  /* ----- Цена: маска/блок клавиш ----- */
  const normalizePrice = (val) => {
    let s = String(val || "").replace(",", ".").replace(/[^\d.]/g, "");
    s = s.replace(/(\..*)\./g, "$1"); // только одна точка
    return s;
  };
  const onPriceChange = (e) => { e.stopPropagation(); setPrice(normalizePrice(e.target.value)); };
  const blockBadKeys = (e) => {
    const bad = ["e","E","+","-","ArrowUp","ArrowDown"];
    if (bad.includes(e.key)) e.preventDefault();
    if (e.key === "Enter") e.preventDefault();
    e.stopPropagation();
  };

  /* ----- Submit (PATCH) ----- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!name.trim()) { alert("Введите название"); return; }
    if (!group) { alert("Выберите группу"); return; }

    const retailPriceNum = parseFloat((price || "").replace(",", "."));
    if (!isFinite(retailPriceNum) || retailPriceNum <= 0) { alert("Укажите корректную цену"); return; }

    // Числовые поля
    const num = (v) => (v === "" ? 0 : Number(v.toString().replace(",", ".")) || 0);
    const stockNum  = num(stock);
    const widthNum  = num(width);
    const heightNum = num(height);
    const lengthNum = num(length);
    const weightNum = num(weight);

    const fd = new FormData();

    // Основное
    fd.append("name", name.trim());
    fd.append("sku", sku.trim());
    fd.append("description", description);
    fd.append("group", group);

    // Медиа
    images.forEach(img => img.file && fd.append("images", img.file));
    images.forEach(img => img.serverUrl && fd.append("serverImages[]", img.serverUrl));
    if (videoFile) fd.append("video", videoFile);
    if (videoUrl) fd.append("videoUrl", videoUrl);

    // Цена (по схеме ProductSchema)
    fd.append("priceMode", "retail");
    fd.append("retailPrice", String(retailPriceNum));
    fd.append("retailCurrency", currency);
    fd.append("priceFromFlag", "0");

    // Склад
    fd.append("unit", unit);
    fd.append("stock", String(stockNum));
    fd.append("stockState", stockState);

    // Видимость
    fd.append("availability", visibility);

    // Размещение / Поиск
    fd.append("queries", JSON.stringify(queries));
    fd.append("googleCategory", googleCategory);

    // Характеристики
    fd.append("attrs", JSON.stringify(attrs.filter(a => a.key && a.value)));

    // Габариты
    fd.append("width",  String(widthNum));
    fd.append("height", String(heightNum));
    fd.append("length", String(lengthNum));
    fd.append("weight", String(weightNum));

    // SEO
    fd.append("seoTitle", seoTitle || name.trim());
    fd.append("seoDesc", seoDesc);
    fd.append("seoKeys", seoKeys);
    fd.append("seoSlug", seoSlug);
    fd.append("seoNoindex", seoNoindex ? "1" : "0");

    try {
      setIsSaving(true);
      await api.patch(`/api/products/${id}`, fd);
      navigate("/admin/products");
    } catch (err) {
      alert("Ошибка сохранения: " + (err?.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="add-prod products-page">
      <AdminSubMenu type="products" activeKey="edit" />

      <div className="addprod-topbar">
        <button className="btn-ghost" onClick={() => navigate("/admin/products")}>← Назад</button>
        <button type="submit" form="edit-prod-form" disabled={isSaving} className="btn-primary">
          {isSaving ? "Сохраняем..." : "Сохранить изменения"}
        </button>
      </div>

      <form id="edit-prod-form" className="addprod-form" onSubmit={handleSubmit}>
        <div className="layout-grid">

          {/* ===== ЛЕВАЯ КОЛОНКА ===== */}
          <div className="main-col">

            {/* Основная информация */}
            <div className="card">
              <div className="card-title">Основная информация</div>

              <div className="form-row two name-sku">
                <div className="field-col">
                  <label>Название <span className="muted">({name.length}/{NAME_MAX})</span></label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                    placeholder="Название товара"
                    type="text"
                  />
                </div>
                <div className="field-col">
                  <label>Код / Артикул <span className="muted">({sku.length}/{SKU_MAX})</span></label>
                  <input
                    value={sku}
                    onChange={(e) => setSku(e.target.value.slice(0, SKU_MAX))}
                    placeholder="Артикул"
                    type="text"
                  />
                </div>
              </div>

              <div className="field-col">
                <label>Описание <span className="muted">({descLen}/{DESC_MAX})</span></label>
                <LocalEditor
                  value={description}
                  onChange={onChangeDescription}
                  placeholder="Описание товара..."
                  minHeight={220}
                />
              </div>

              <div className="media-block">
                <div className="field-col">
                  <label>Фото <span className="muted">(до {MAX_IMAGES})</span></label>
                  <input type="file" multiple accept="image/*" ref={inputFileRef} style={{ display: "none" }} onChange={onImagesChange} />
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
                    <input type="url" value={videoUrl} onChange={(e) => onVideoUrl(e.target.value)} placeholder="Ссылка на YouTube/Vimeo (если есть)" />
                    <input type="file" accept="video/*" ref={inputVideoRef} className="file-input-hidden" onChange={onVideoFile} />
                    <button type="button" className="btn-outline" onClick={() => inputVideoRef.current?.click()}>Загрузить файл</button>
                  </div>
                  {(videoUrl || videoFile) && (
                    <div className="video-preview">
                      <PlayBadge size={18} />
                      {videoUrl ? <span className="muted">Ссылка указана</span> : <span className="muted">{videoFile?.name}</span>}
                      <button type="button" className="btn-mini" onClick={() => { setVideoUrl(""); setVideoFile(null); if (inputVideoRef.current) inputVideoRef.current.value = ""; }}>Очистить</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ЦЕНА */}
            <PriceBox
              price={price}
              currency={currency}
              unit={unit}
              stock={stock}
              stockState={stockState}
              onPriceChange={onPriceChange}
              onCurrencyChange={setCurrency}
              onUnitChange={setUnit}
              onStockChange={setStock}
              onStockStateChange={setStockState}
              blockBadKeys={blockBadKeys}
            />

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
                      onChange={(e) => setAttrs(p => p.map(x => x.id === a.id ? { ...x, key: e.target.value } : x))}
                      placeholder="Напр. Цвет"
                      type="text"
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
                      onChange={(e) => setAttrs(p => p.map(x => x.id === a.id ? { ...x, value: e.target.value } : x))}
                      placeholder="Напр. Зеленый"
                      type="text"
                    />
                    <datalist id={`attr-values-${a.id}`}>
                      {(ATTR_SUGGEST[a.key] || []).map(v => <option key={v} value={v} />)}
                    </datalist>
                  </div>

                  <button type="button" className="btn-ghost danger" onClick={() => setAttrs(p => p.filter(x => x.id !== a.id))}>Удалить</button>
                </div>
              ))}

              <div>
                <button type="button" className="btn-outline" onClick={() => setAttrs(p => [...p, { id: genId(), key: "", value: "" }])}>+ Добавить характеристику</button>
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
                type="text"
              />
              <div className="chips">
                {queries.map((q, i) => (
                  <span key={i} className="chip">{q}<b onClick={() => removeQuery(q)}>×</b></span>
                ))}
              </div>
            </div>

            {/* Категория Google */}
            <div className="card">
              <div className="card-title">Категория товара для Google</div>
              <AsyncGoogleCategorySelect value={googleCategory} onChange={setGoogleCategory} lang="ru-RU" />
            </div>

            {/* Габариты */}
            <div className="card">
              <div className="card-title">Габариты</div>
              <div className="form-row four">
                <div className="field-col"><label>Ширина, см</label><input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Ширина" type="text" /></div>
                <div className="field-col"><label>Высота, см</label><input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Высота" type="text" /></div>
                <div className="field-col"><label>Длина, см</label><input value={length} onChange={(e) => setLength(e.target.value)} placeholder="Длина" type="text" /></div>
                <div className="field-col"><label>Вес, кг</label><input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Вес" type="text" /></div>
              </div>
            </div>

            {/* SEO */}
            <div className="card">
              <div className="card-title">SEO</div>
              <div className="form-row two">
                <div className="field-col"><label>Title</label><input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Title страницы товара" type="text" /></div>
                <div className="field-col"><label>Slug (ЧПУ)</label><input value={seoSlug} onChange={(e) => setSeoSlug(e.target.value)} placeholder="nasos-mantga-011-0200" type="text" /></div>
              </div>
              <div className="form-row"><label className="field-col"><span>Description</span><textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} placeholder="Краткое описание для meta-description" /></label></div>
              <div className="form-row two">
                <div className="field-col"><label>Keywords</label><input value={seoKeys} onChange={(e) => setSeoKeys(e.target.value)} placeholder="ключевые слова через запятую" type="text" /></div>
                <label className="checkline"><input type="checkbox" checked={seoNoindex} onChange={(e) => setSeoNoindex(e.target.checked)} />Не индексировать (noindex, nofollow)</label>
              </div>
            </div>
          </div>

          {/* ===== ПРАВАЯ КОЛОНКА ===== */}
          <div className="side-col">
            {/* Размещение — Группы */}
            <div className="card">
              <div className="card-title">Размещение — Группы</div>
              <div className="tree-wrap">
                {groupsTree.length ? renderTree(groupsTree) : <div className="muted">Загрузка дерева…</div>}
              </div>
            </div>

            {/* Видимость */}
            <div className="card">
              <div className="card-title">Видимость</div>
              <div className="seg">
                <label className="muted">Статус</label>
                <div className="seg-items">
                  <button type="button" className={visibility === "published" ? "active" : ""} onClick={() => setVisibility("published")}>Опубликовать</button>
                  <button type="button" className={visibility === "hidden" ? "active" : ""} onClick={() => setVisibility("hidden")}>Скрыть</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LocalEditor from "../components/LocalEditor";
import AdminSubMenu from "./AdminSubMenu";
import api from "../utils/api.js";
import "../assets/AdminPanel.css";
import "../assets/AdminAddProductPage.css";

const genId = () => Math.random().toString(36).slice(2) + Date.now();

export default function AdminAddProductPage() {
  const navigate = useNavigate();

  // Основное
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("шт");
  const [availability, setAvailability] = useState("published");
  const [stock, setStock] = useState("");

  // Характеристики
  const [charColor, setCharColor] = useState("");
  const [charBrand, setCharBrand] = useState("");

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKeys, setSeoKeys] = useState("");

  // Поисковые запросы
  const [queryInput, setQueryInput] = useState("");
  const [queries, setQueries] = useState([]);

  // Габариты
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");

  // Прочее
  const [groups, setGroups] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Фото
  const [images, setImages] = useState([]); // [{id,url,file}]
  const inputFileRef = useRef(null);

  /* --------- данные --------- */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/groups/tree");
        const flat = [];
        const walk = (arr) =>
          arr.forEach((g) => {
            if (g.name !== "Родительская группа") flat.push(g);
            if (g.children?.length) walk(g.children);
          });
        walk(data);
        setGroups(flat);
      } catch (e) {
        console.error("Ошибка загрузки групп:", e);
      }
    })();
  }, []);

  /* --------- фото --------- */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImages((prev) => {
      const existing = prev.slice(0, 10); // safety
      const add = [];
      for (const f of files) {
        if (existing.length + add.length >= 10) break; // 1 + 9
        add.push({ id: genId(), file: f, url: URL.createObjectURL(f) });
      }
      return [...existing, ...add].slice(0, 10);
    });

    if (inputFileRef.current) inputFileRef.current.value = null;
  };

  const handleRemoveImage = (id) =>
    setImages((p) => p.filter((i) => i.id !== id));

  /* --------- queries --------- */
  const onQueryKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = queryInput.trim();
      if (val && !queries.includes(val)) setQueries((q) => [...q, val]);
      setQueryInput("");
    }
  };

  /* --------- submit --------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const fd = new FormData();
    fd.append("name", name);
    fd.append("sku", sku);
    fd.append("description", description);
    fd.append("group", group);
    fd.append("price", price);
    fd.append("unit", unit);
    fd.append("availability", availability);
    fd.append("stock", stock);

    fd.append("charColor", charColor);
    fd.append("charBrand", charBrand);

    fd.append("width", width);
    fd.append("height", height);
    fd.append("length", length);
    fd.append("weight", weight);

    fd.append("seoTitle", seoTitle);
    fd.append("seoDesc", seoDesc);
    fd.append("seoKeys", seoKeys);
    fd.append("queries", JSON.stringify(queries));

    images.forEach((img) => img.file && fd.append("images", img.file));

    try {
      setIsSaving(true);
      await api.post("/api/products", fd);
      navigate("/admin/products");
    } catch (err) {
      alert("Ошибка при сохранении: " + (err?.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  /* --------- рендер --------- */
  // 9 миниатюр под главным — заполняем плейсхолдерами
  const thumbs = images.slice(1, 10);
  const thumbSlots = Array.from({ length: 9 }).map((_, i) => thumbs[i] ?? null);

  return (
    <div className="products-page add-prod">
      {/* левый субменю (как на списке товаров) */}
      <AdminSubMenu type="products" activeKey="create" />

      {/* шапка страницы */}
      <div className="addprod-topbar">
        <button className="btn-ghost" type="button" onClick={() => navigate("/admin/products")}>
          ← Назад
        </button>
        <button className="btn-primary" type="submit" form="add-prod-form" disabled={isSaving}>
          {isSaving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>

      {/* форма */}
      <form id="add-prod-form" className="addprod-form" onSubmit={handleSubmit}>
        {/* первая полоса: Название | Код | Фото */}
        <div className="addprod-row-top">
          <div className="field-col">
            <label>Название*</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Введите название товара"
            />
          </div>

          <div className="field-col field-col--code">
            <label>Код</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Например: TRK-001"
            />
          </div>

          <div className="photos-col">
            <input
              type="file"
              multiple
              accept="image/*"
              ref={inputFileRef}
              style={{ display: "none" }}
              onChange={handleImageChange}
            />

            <div className="photo-main" onClick={() => inputFileRef.current?.click()}>
              {images[0] ? <img src={images[0].url} alt="" /> : <span>+</span>}
              {images[0] && (
                <button
                  type="button"
                  className="photo-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(images[0].id);
                  }}
                  aria-label="Удалить главное фото"
                >
                  ×
                </button>
              )}
            </div>

            <div className="photo-thumbs">
              {thumbSlots.map((img, idx) =>
                img ? (
                  <div key={img.id} className="thumb">
                    <img src={img.url} alt="" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      aria-label="Удалить фото"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div
                    key={`ph-${idx}`}
                    className="thumb add"
                    onClick={() => inputFileRef.current?.click()}
                    aria-label="Добавить фото"
                  >
                    +
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Описание — широкая полоса */}
        <div className="card form-row">
          <label>Описание</label>
          <LocalEditor
            value={description}
            onChange={setDescription}
            placeholder="Описание товара…"
          />
        </div>

        {/* Дальше — как было (аккуратно упаковано в карточки) */}
        <div className="card">
          <div className="card-title">Характеристики</div>
          <div className="form-row"><label>Цвет</label><input value={charColor} onChange={(e) => setCharColor(e.target.value)} /></div>
          <div className="form-row"><label>Производитель</label><input value={charBrand} onChange={(e) => setCharBrand(e.target.value)} /></div>
        </div>

        <div className="card">
          <div className="card-title">SEO</div>
          <div className="form-row"><label>Title</label><input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} /></div>
          <div className="form-row"><label>Description</label><textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} /></div>
          <div className="form-row"><label>Keywords</label><input value={seoKeys} onChange={(e) => setSeoKeys(e.target.value)} /></div>
        </div>

        <div className="card">
          <div className="card-title">Поисковые запросы</div>
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={onQueryKey}
            placeholder="Введите фразу и нажмите Enter"
          />
          <div className="chips">
            {queries.map((q) => (
              <span key={q} className="chip">{q}<b onClick={() => setQueries(queries.filter((x) => x !== q))}>×</b></span>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Габариты</div>
          <div className="form-row four">
            <input value={width}  onChange={(e) => setWidth(e.target.value)}  placeholder="Ширина" />
            <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Высота" />
            <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="Длина" />
            <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Вес" />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Группа</div>
          <select value={group} onChange={(e) => setGroup(e.target.value)} required>
            <option value="">Выберите</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="card">
          <div className="card-title">Цена и наличие</div>
          <div className="form-row three">
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Цена" />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ед. изм." />
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Остаток" />
          </div>
          <div className="form-row radios">
            <label><input type="radio" name="av" checked={availability === "published"} onChange={() => setAvailability("published")} /> Опубликован</label>
            <label><input type="radio" name="av" checked={availability === "draft"}     onChange={() => setAvailability("draft")} /> Черновик</label>
            <label><input type="radio" name="av" checked={availability === "hidden"}    onChange={() => setAvailability("hidden")} /> Скрыт</label>
          </div>
        </div>
      </form>
    </div>
  );
}

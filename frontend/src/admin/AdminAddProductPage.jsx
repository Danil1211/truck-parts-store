import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LocalEditor from "../components/LocalEditor";
import AdminSubMenu from "./AdminSubMenu";
import api from "../utils/api.js";
import "../assets/AdminPanel.css";
import "../assets/AdminAddProductPage.css";

const genId = () => Math.random().toString(36).slice(2) + Date.now();
const MAX_IMAGES = 10; // 1 главный + до 9 миниатюр

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

  // Queries
  const [queryInput, setQueryInput] = useState("");
  const [queries, setQueries] = useState([]);

  // Габариты
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");

  const [groups, setGroups] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [images, setImages] = useState([]);
  const inputFileRef = useRef(null);

  // ===== Автосохранение черновика =====
  useEffect(() => {
    const draft = localStorage.getItem("draftProduct");
    if (draft) {
      try {
        const obj = JSON.parse(draft);
        const setters = {
          name: setName, sku: setSku, description: setDescription, group: setGroup,
          price: setPrice, unit: setUnit, availability: setAvailability, stock: setStock,
          charColor: setCharColor, charBrand: setCharBrand,
          seoTitle: setSeoTitle, seoDesc: setSeoDesc, seoKeys: setSeoKeys,
          queries: setQueries,
          width: setWidth, height: setHeight, length: setLength, weight: setWeight,
        };
        Object.keys(setters).forEach((k) => {
          if (obj[k] !== undefined) setters[k](obj[k]);
        });
      } catch {}
    }
  }, []);
  useEffect(() => {
    const draft = {
      name, sku, description, group, price, unit, availability, stock,
      charColor, charBrand, seoTitle, seoDesc, seoKeys, queries,
      width, height, length, weight,
    };
    localStorage.setItem("draftProduct", JSON.stringify(draft));
  }, [
    name, sku, description, group, price, unit, availability, stock,
    charColor, charBrand, seoTitle, seoDesc, seoKeys, queries,
    width, height, length, weight
  ]);

  // ===== Подгрузка групп =====
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
      } catch (err) {
        console.error("Ошибка загрузки групп:", err);
      }
    })();
  }, []);

  // SEO title = имя
  useEffect(() => { if (name) setSeoTitle(name); }, [name]);

  // ===== Картинки =====
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => {
      const prevFiles = prev.map((i) => i.file).filter(Boolean);
      const allFiles = [...prevFiles, ...files].slice(0, MAX_IMAGES);
      const seen = new Set();
      const unique = [];
      for (const f of allFiles) {
        const key = f.name + "_" + f.size;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push({ file: f, url: URL.createObjectURL(f), id: genId() });
        }
      }
      return unique;
    });
    if (inputFileRef.current) inputFileRef.current.value = null;
  };
  const handleRemoveImage = (id) => setImages((p) => p.filter((i) => i.id !== id));

  // ===== Queries =====
  const handleQueryInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = queryInput.trim();
      if (val && !queries.includes(val)) {
        setQueries([...queries, val]);
        setQueryInput("");
      }
    }
  };
  const handleRemoveQuery = (val) => setQueries(queries.filter((q) => q !== val));

  // ===== Submit =====
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
      localStorage.removeItem("draftProduct");
      navigate("/admin/products");
    } catch (err) {
      alert("Ошибка при сохранении: " + (err?.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Сколько пустых ячеек показать под миниатюры (чтобы всегда было видно до 9)
  const emptyThumbs = Math.max(0, MAX_IMAGES - images.length);

  return (
    <div className="add-prod products-page">
      {/* Субменю «Товары» */}
      <AdminSubMenu type="products" activeKey="create" />

      {/* Верхняя полоса (строго, без скруглений) */}
      <div className="addprod-topbar">
        <button className="btn-ghost" onClick={() => navigate("/admin/products")}>← Назад</button>
        <button type="submit" form="add-prod-form" disabled={isSaving} className="btn-primary">
          {isSaving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>

      {/* Форма */}
      <form id="add-prod-form" className="addprod-form" onSubmit={handleSubmit}>
        <div className="addprod-grid">
          {/* Название (широкое) */}
          <div className="field-col">
            <label>Название*</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Введите название товара" />
          </div>

          {/* Код (ужатый) */}
          <div className="field-col field-col--code">
            <label>Код</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Артикул / код" />
          </div>

          {/* Фото (компактнее) */}
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
                <button type="button" className="photo-remove" onClick={() => handleRemoveImage(images[0].id)}>×</button>
              )}
            </div>

            <div className="photo-thumbs">
              {images.slice(1).map((img) => (
                <div key={img.id} className="thumb">
                  <img src={img.url} alt="" />
                  <button type="button" onClick={() => handleRemoveImage(img.id)}>×</button>
                </div>
              ))}

              {/* Пустые ячейки для добора до 10 штук (1 главный + 9 миниатюр) */}
              {Array.from({ length: emptyThumbs }).map((_, i) => (
                <div key={`add-${i}`} className="thumb add" onClick={() => inputFileRef.current?.click()}>+</div>
              ))}
            </div>
          </div>

          {/* Описание — сразу под Названием/Кодом (занимает 2 колонки слева) */}
          <div className="desc-card card">
            <div className="card-title">Описание</div>
            <LocalEditor value={description} onChange={setDescription} placeholder="Описание товара..." />
          </div>

          {/* Ниже: всё остальное «как было», аккуратно стопкой в 2-х левых колонках */}
          <div className="main-stack">
            {/* Характеристики */}
            <div className="card">
              <div className="card-title">Характеристики</div>
              <div className="form-row"><label>Цвет</label><input value={charColor} onChange={(e) => setCharColor(e.target.value)} /></div>
              <div className="form-row"><label>Производитель</label><input value={charBrand} onChange={(e) => setCharBrand(e.target.value)} /></div>
            </div>

            {/* SEO */}
            <div className="card">
              <div className="card-title">SEO</div>
              <div className="form-row"><label>Title</label><input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} /></div>
              <div className="form-row"><label>Description</label><textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} /></div>
              <div className="form-row"><label>Keywords</label><input value={seoKeys} onChange={(e) => setSeoKeys(e.target.value)} /></div>
            </div>

            {/* Поисковые запросы */}
            <div className="card">
              <div className="card-title">Поисковые запросы</div>
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={handleQueryInputKeyDown}
                placeholder="Введите и Enter"
              />
              <div className="chips">
                {queries.map((q, i) => (
                  <span key={i} className="chip">{q}<b onClick={() => handleRemoveQuery(q)}>×</b></span>
                ))}
              </div>
            </div>

            {/* Габариты */}
            <div className="card">
              <div className="card-title">Габариты</div>
              <div className="form-row four">
                <input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Ширина" />
                <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Высота" />
                <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="Длина" />
                <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Вес" />
              </div>
            </div>

            {/* Группа */}
            <div className="card">
              <div className="card-title">Группа</div>
              <select value={group} onChange={(e) => setGroup(e.target.value)} required>
                <option value="">Выберите</option>
                {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>

            {/* Цена и наличие */}
            <div className="card">
              <div className="card-title">Цена и наличие</div>
              <div className="form-row three">
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Цена" />
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ед. изм." />
                <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Остаток" />
              </div>
              <div className="form-row radios">
                <label><input type="radio" name="av" checked={availability === "published"} onChange={() => setAvailability("published")} /> Опубликован</label>
                <label><input type="radio" name="av" checked={availability === "draft"} onChange={() => setAvailability("draft")} /> Черновик</label>
                <label><input type="radio" name="av" checked={availability === "hidden"} onChange={() => setAvailability("hidden")} /> Скрыт</label>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

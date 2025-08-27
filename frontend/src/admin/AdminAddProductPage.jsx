import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LocalEditor from "../components/LocalEditor";
import AdminSubMenu from "./AdminSubMenu";
import api from "../utils/api.js";
import "../assets/AdminPanel.css";
import "../assets/AdminAddProductPage.css";

const genId = () => Math.random().toString(36).slice(2) + Date.now();
const MAX_IMAGES = 10; // как на Prom: 0..10

export default function AdminAddProductPage() {
  const navigate = useNavigate();

  // Основное
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("шт");
  const [stock, setStock] = useState("");
  const [availability, setAvailability] = useState("published"); // Видимость: published|draft|hidden

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

  const [groups, setGroups] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Медиа
  const [images, setImages] = useState([]);
  const inputFileRef = useRef(null);

  /* ===== Автосохранение черновика ===== */
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
          images: setImages
        };
        Object.keys(setters).forEach((k) => obj[k] !== undefined && setters[k](obj[k]));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const draft = {
      name, sku, description, group, price, unit, availability, stock,
      charColor, charBrand, seoTitle, seoDesc, seoKeys, queries,
      width, height, length, weight, images
    };
    localStorage.setItem("draftProduct", JSON.stringify(draft));
  }, [
    name, sku, description, group, price, unit, availability, stock,
    charColor, charBrand, seoTitle, seoDesc, seoKeys, queries,
    width, height, length, weight, images
  ]);

  /* ===== Группы ===== */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/groups/tree");
        const flat = [];
        const walk = (arr) => arr.forEach((g) => {
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

  /* ===== SEO title из имени ===== */
  useEffect(() => { if (name) setSeoTitle(name); }, [name]);

  /* ===== Картинки ===== */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => {
      const prevFiles = prev.map((i) => i.file).filter(Boolean);
      const allFiles = [...prevFiles, ...files];
      const seen = new Set();
      const uniq = [];
      for (const f of allFiles) {
        const key = f.name + "_" + f.size;
        if (!seen.has(key)) {
          seen.add(key);
          uniq.push({ file: f, url: URL.createObjectURL(f), id: genId() });
        }
      }
      return uniq.slice(0, MAX_IMAGES);
    });
    if (inputFileRef.current) inputFileRef.current.value = null;
  };
  const handleRemoveImage = (id) => setImages((p) => p.filter((i) => i.id !== id));

  /* ===== Queries ===== */
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

  /* ===== Submit ===== */
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
    fd.append("availability", availability); // published|draft|hidden
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

  const emptyTiles = Math.max(0, MAX_IMAGES - images.length);

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
          {/* ===== ЛЕВАЯ КОЛОНКА (как Prom) ===== */}
          <div className="main-col">
            <div className="card">
              <div className="card-title">Основная информация</div>

              <div className="row-name-code">
                <div className="field-col">
                  <label>Название позиции *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Например, насос водяной MAN TGA..."
                  />
                </div>
                <div className="field-col">
                  <label>Код / Артикул</label>
                  <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Артикул" />
                </div>
              </div>

              <div className="field-col">
                <label>Описание *</label>
                <LocalEditor value={description} onChange={setDescription} placeholder="Описание товара..." />
              </div>
            </div>

            <div className="card">
              <div className="card-title">Цена и наличие</div>
              <div className="form-row four">
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Цена" />
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ед. изм." />
                <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Остаток" />
                <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
                  <option value="published">Опубликован</option>
                  <option value="draft">Черновик</option>
                  <option value="hidden">Скрыт</option>
                </select>
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
              <div className="card-title">Характеристики</div>
              <div className="form-row two">
                <div className="field-col">
                  <label>Цвет</label>
                  <input value={charColor} onChange={(e) => setCharColor(e.target.value)} />
                </div>
                <div className="field-col">
                  <label>Производитель</label>
                  <input value={charBrand} onChange={(e) => setCharBrand(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">SEO</div>
              <div className="form-row">
                <label>Title</label>
                <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
              </div>
              <div className="form-row">
                <label>Description</label>
                <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} />
              </div>
              <div className="form-row">
                <label>Keywords</label>
                <input value={seoKeys} onChange={(e) => setSeoKeys(e.target.value)} />
              </div>
            </div>

            <div className="card">
              <div className="card-title">Поисковые запросы</div>
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={handleQueryInputKeyDown}
                placeholder="Введите запрос и нажмите Enter"
              />
              <div className="chips">
                {queries.map((q, i) => (
                  <span key={i} className="chip">{q}<b onClick={() => handleRemoveQuery(q)}>×</b></span>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Габариты</div>
              <div className="form-row four">
                <input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Ширина" />
                <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Высота" />
                <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="Длина" />
                <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Вес" />
              </div>
            </div>
          </div>

          {/* ===== ПРАВАЯ КОЛОНКА ===== */}
          <div className="side-col">
            <div className="card">
              <div className="card-title">Видимость</div>
              <div className="form-row radios">
                <label><input type="radio" name="vis" checked={availability === "published"} onChange={() => setAvailability("published")} /> опубликовано</label>
                <label><input type="radio" name="vis" checked={availability === "draft"} onChange={() => setAvailability("draft")} /> черновик</label>
                <label><input type="radio" name="vis" checked={availability === "hidden"} onChange={() => setAvailability("hidden")} /> скрытый</label>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Создание и обновление</div>
              <div className="kv">
                <div><span>Создано:</span><b>-</b></div>
                <div><span>Обновлено:</span><b>-</b></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Изображения ({images.length} из {MAX_IMAGES})</div>

              <input
                type="file"
                multiple
                accept="image/*"
                ref={inputFileRef}
                style={{ display: "none" }}
                onChange={handleImageChange}
              />

              <div className="media-grid">
                {images.map((img) => (
                  <div key={img.id} className="thumb">
                    <img src={img.url} alt="" />
                    <button type="button" onClick={() => handleRemoveImage(img.id)}>×</button>
                  </div>
                ))}
                {Array.from({ length: emptyTiles }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="thumb add"
                    onClick={() => inputFileRef.current?.click()}
                  >
                    +
                  </div>
                ))}
              </div>
              <div className="add-by-link" onClick={() => inputFileRef.current?.click()}>
                Добавить фото
              </div>
            </div>

            <div className="card">
              <div className="card-title">Видео (0 из 3)</div>
              <div className="media-grid">
                <div className="thumb add">+</div>
                <div className="thumb add">+</div>
                <div className="thumb add">+</div>
              </div>
              <div className="add-by-link">Добавить видео по ссылке</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

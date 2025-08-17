import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LocalEditor from "../components/LocalEditor";

const genId = () => Math.random().toString(36).slice(2) + Date.now();

export default function AdminAddProductPage() {
  const navigate = useNavigate();

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

  // Поисковые запросы
  const [queryInput, setQueryInput] = useState("");
  const [queries, setQueries] = useState([]);
  const queryInputRef = useRef(null);

  // Габариты
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");

  const [groups, setGroups] = useState([]);
  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => {
        const flatGroups = [];
        const flatten = (arr) => {
          arr.forEach((g) => {
            if (g.name !== "Родительская группа") flatGroups.push(g);
            if (g.children && g.children.length) flatten(g.children);
          });
        };
        flatten(data);
        setGroups(flatGroups);
      });
  }, []);

  // ФОТО
  const [images, setImages] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const inputFileRef = useRef(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => {
      const prevFiles = prev.map(i => i.file);
      const allFiles = [...prevFiles, ...files].slice(0, 10);
      const uniqueFiles = [];
      const seen = new Set();
      for (const f of allFiles) {
        if (!f) continue;
        const key = `${f.name}_${f.size}`;
        if (!seen.has(key) && uniqueFiles.length < 10) {
          seen.add(key);
          uniqueFiles.push(f);
        }
      }
      return uniqueFiles.map(f => {
        const exist = prev.find(img => img.file.name === f.name && img.file.size === f.size);
        return exist ? exist : { file: f, url: URL.createObjectURL(f), id: genId() };
      });
    });
    if (inputFileRef.current) inputFileRef.current.value = null;
  };

  const handleRemoveImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleDragStart = (idx) => setDraggedIndex(idx);
  const handleDragOver = (idx) => (e) => { e.preventDefault(); };
  const handleDrop = (idx) => {
    if (draggedIndex === null || draggedIndex === idx) {
      setDraggedIndex(null);
      return;
    }
    setImages(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(draggedIndex, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    setDraggedIndex(null);
  };

  useEffect(() => {
    return () => { images.forEach(img => URL.revokeObjectURL(img.url)); };
  }, [images]);

  // Поисковые запросы
  const handleQueryInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = queryInput.trim();
      if (value && !queries.includes(value)) {
        setQueries([...queries, value]);
        setQueryInput("");
      }
    }
  };
  const handleRemoveQuery = (val) => {
    setQueries(queries.filter(q => q !== val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("sku", sku);
    formData.append("description", description);
    formData.append("group", group);
    formData.append("price", price);
    formData.append("unit", unit);
    formData.append("availability", availability);
    formData.append("stock", stock);
    formData.append("charColor", charColor);
    formData.append("charBrand", charBrand);
    formData.append("width", width);
    formData.append("height", height);
    formData.append("length", length);
    formData.append("weight", weight);
    formData.append("queries", JSON.stringify(queries));
    images.forEach((img) => {
      formData.append("images", img.file);
    });

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Ошибка при сохранении!");
      navigate("/admin/products");
    } catch (err) {
      alert("Ошибка при сохранении позиции: " + err.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f6fafd",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      padding: 0,
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 1400,
        margin: "0 auto",
        padding: "0 32px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 4px 18px #1a90ff0b, 0 1.5px 5px #2291ff14",
          padding: "20px 38px",
          marginTop: 38,
          marginBottom: 0,
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          minHeight: 64,
        }}>
          <button
            onClick={() => navigate("/admin/products")}
            style={{
              background: "#eaf4ff",
              color: "#2291ff",
              border: "none",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              padding: "10px 22px 10px 15px",
              boxShadow: "0 1px 7px #2291ff11",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              marginLeft: 0,
              transition: "background 0.18s, color 0.18s",
            }}
          >
            <span style={{ fontSize: 20, marginRight: 6 }}>←</span> Назад
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => window.open("/product/demo", "_blank")}
              style={{
                background: "#f7fafb",
                color: "#2291ff",
                border: "1.1px solid #d6ebff",
                borderRadius: 10,
                fontSize: 16,
                padding: "10px 20px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "border 0.18s, background 0.18s, color 0.18s",
              }}
            >
              Посмотреть на сайте
            </button>
            <button
              type="submit"
              form="add-prod-form"
              style={{
                background: "#2291ff",
                color: "#fff",
                borderRadius: 10,
                border: "none",
                fontSize: 16,
                padding: "10px 28px",
                fontWeight: 800,
                boxShadow: "0 2px 9px #2291ff13",
                cursor: "pointer",
                transition: "background 0.18s, color 0.18s",
              }}
            >
              Сохранить позицию
            </button>
          </div>
        </div>

        <form
          id="add-prod-form"
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            display: "flex",
            background: "#fff",
            borderRadius: 14,
            margin: 0,
            marginTop: "32px",
            boxShadow: "0 6px 22px #2291ff0b",
            padding: "22px 0 0 32px",
            alignItems: "flex-start",
            gap: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{
            flex: 2.2,
            padding: "0px 18px 28px 0px",
            borderRight: "1.5px solid #eaf1fa",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 0,
            boxSizing: "border-box",
          }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
              <div style={{ flex: 1.9 }}>
                <label style={{ fontWeight: 700, fontSize: 15, color: "#223", marginBottom: 3, display: "block" }}>Название позиции</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Название товара"
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "9px 11px",
                    borderRadius: 9,
                    border: "1.3px solid #c9e4ff",
                    fontSize: 15,
                    background: "#f6fafd",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 700, fontSize: 15, color: "#223", marginBottom: 3, display: "block" }}>Код / Артикул</label>
                <input
                  type="text"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="Артикул, код"
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "9px 11px",
                    borderRadius: 9,
                    border: "1.3px solid #c9e4ff",
                    fontSize: 15,
                    background: "#f6fafd",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 15, color: "#223", marginBottom: 4, display: "block" }}>Описание</label>
              <LocalEditor value={description} onChange={setDescription} placeholder="Описание товара..." />
            </div>

            {/* БЛОК ХАРАКТЕРИСТИК */}
            <div
              style={{
                background: "#f8fbff",
                border: "1.2px solid #e4effe",
                borderRadius: 14,
                padding: 20,
                margin: "16px 0 18px 0"
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1977cc", marginBottom: 16, letterSpacing: "0.02em" }}>
                Характеристики
              </div>
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 10 }}>
                <label style={{ width: 140, color: "#2a384d", fontWeight: 600 }}>Цвет</label>
                <input
                  value={charColor}
                  onChange={e => setCharColor(e.target.value)}
                  placeholder="Введите цвет"
                  style={{
                    flex: 1,
                    padding: "8px 13px",
                    borderRadius: 8,
                    border: "1.3px solid #b6d4fc",
                    fontSize: 15,
                    background: "#fff"
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 10 }}>
                <label style={{ width: 140, color: "#2a384d", fontWeight: 600 }}>Производитель</label>
                <input
                  value={charBrand}
                  onChange={e => setCharBrand(e.target.value)}
                  placeholder="Введите производителя"
                  style={{
                    flex: 1,
                    padding: "8px 13px",
                    borderRadius: 8,
                    border: "1.3px solid #b6d4fc",
                    fontSize: 15,
                    background: "#fff"
                  }}
                />
              </div>
            </div>

            {/* БЛОК ПОИСКОВЫХ ЗАПРОСОВ */}
            <div
              style={{
                background: "#f8faff",
                border: "1.2px solid #d4eaff",
                borderRadius: 14,
                padding: 20,
                margin: "8px 0 18px 0"
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1977cc", marginBottom: 12 }}>
                Поисковые запросы
              </div>
              <div style={{ color: "#6d85a7", fontSize: 14, marginBottom: 13 }}>
                Здесь вы можете добавить фразы, по которым ваш товар будут искать на сайте.<br />
                Например: <b>накладка тормозная, тормозные колодки MAN, тормоз для грузовика</b><br />
                Нажимайте <b>Enter</b> после каждого запроса.
              </div>
              <input
                ref={queryInputRef}
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
                onKeyDown={handleQueryInputKeyDown}
                placeholder="Добавить поисковый запрос и нажать Enter"
                style={{
                  width: "100%",
                  padding: "9px 13px",
                  borderRadius: 9,
                  border: "1.3px solid #b6d4fc",
                  fontSize: 15,
                  background: "#fff",
                  marginBottom: 12,
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {queries.map((q, i) => (
                  <span key={i}
                    style={{
                      display: "flex", alignItems: "center",
                      background: "#f2f6fb",
                      border: "1px solid #d2e8fa",
                      borderRadius: 18,
                      padding: "5px 13px 5px 13px",
                      fontSize: 14,
                      color: "#1573bd",
                      fontWeight: 500,
                    }}>
                    {q}
                    <span
                      onClick={() => handleRemoveQuery(q)}
                      style={{
                        marginLeft: 8,
                        cursor: "pointer",
                        color: "#ff6565",
                        fontWeight: 900,
                        fontSize: 18,
                        lineHeight: "14px",
                        display: "inline-block",
                        transform: "translateY(1px)",
                      }}
                      title="Удалить"
                    >&times;</span>
                  </span>
                ))}
              </div>
            </div>

            {/* БЛОК ГАБАРИТОВ */}
            <div
              style={{
                background: "#f8fbff",
                border: "1.2px solid #e4effe",
                borderRadius: 14,
                padding: 20,
                margin: "8px 0 18px 0"
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1977cc", marginBottom: 11 }}>
                Габариты товара
              </div>
              <div style={{ color: "#7d91ac", fontSize: 14, marginBottom: 17 }}>
                Укажите габариты (Не обязательно)
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <input
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  placeholder="Ширина (мм)"
                  type="number"
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.3px solid #b6d4fc",
                    fontSize: 15,
                    background: "#fff",
                  }}
                />
                <input
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder="Высота (мм)"
                  type="number"
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.3px solid #b6d4fc",
                    fontSize: 15,
                    background: "#fff",
                  }}
                />
                <input
                  value={length}
                  onChange={e => setLength(e.target.value)}
                  placeholder="Длина (мм)"
                  type="number"
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.3px solid #b6d4fc",
                    fontSize: 15,
                    background: "#fff",
                  }}
                />
                <input
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="Вес (грамм)"
                  type="number"
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.3px solid #b6d4fc",
                    fontSize: 15,
                    background: "#fff",
                  }}
                />
              </div>
            </div>

            {/* ===== БЛОК ГРУППА ТОВАРА ===== */}
            <div
              style={{
                background: "#f8faff",
                border: "1.2px solid #d4eaff",
                borderRadius: 14,
                padding: 20,
                margin: "8px 0 18px 0"
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1977cc", marginBottom: 11 }}>
                Группа товара
              </div>
              <select
                value={group}
                onChange={e => setGroup(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "9px 11px",
                  borderRadius: 9,
                  border: "1.3px solid #c9e4ff",
                  fontSize: 15,
                  background: "#f6fafd",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Выберите группу</option>
                {groups.map(g => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ===== БЛОК ЦЕНА И НАЛИЧИЕ ===== */}
            <div
              style={{
                background: "#f8fbff",
                border: "1.2px solid #e4effe",
                borderRadius: 14,
                padding: 20,
                margin: "8px 0 18px 0"
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1977cc", marginBottom: 11 }}>
                Цена и наличие
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                  placeholder="Цена"
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.2px solid #c9e4ff",
                    fontSize: 15,
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="Ед. изм."
                  style={{
                    flex: 1,
                    minWidth: 90,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.2px solid #c9e4ff",
                    fontSize: 15,
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
                <input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="Остаток"
                  style={{
                    flex: 1,
                    minWidth: 90,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.2px solid #c9e4ff",
                    fontSize: 15,
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334", display: "flex", alignItems: "center", gap: 5 }}>
                  <input type="radio" name="visibility" checked={availability === "published"} value="published" onChange={() => setAvailability("published")} />
                  Опубликовано
                </label>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334", display: "flex", alignItems: "center", gap: 5 }}>
                  <input type="radio" name="visibility" checked={availability === "draft"} value="draft" onChange={() => setAvailability("draft")} />
                  Черновик
                </label>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334", display: "flex", alignItems: "center", gap: 5 }}>
                  <input type="radio" name="visibility" checked={availability === "hidden"} value="hidden" onChange={() => setAvailability("hidden")} />
                  Скрытый
                </label>
              </div>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 340,
              maxWidth: 410,
              padding: "0px 24px 28px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 15,
              alignItems: "stretch",
              marginRight: 0,
              boxSizing: "border-box",
            }}
          >
            {/* Фото */}
            <div>
              <label style={{ fontWeight: 700, color: "#1b2437", fontSize: 15, marginBottom: 3, display: "block" }}>Фото товара</label>
              <div
                style={{
                  background: "#f8fbff",
                  border: "1.2px dashed #b6d4fc",
                  borderRadius: 11,
                  padding: "13px 8px 16px 8px",
                  minHeight: 255,
                }}
                onDrop={e => {
                  e.preventDefault();
                  handleImageChange({ target: { files: e.dataTransfer.files } });
                }}
                onDragOver={e => e.preventDefault()}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={inputFileRef}
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                  id="product-images-input"
                />
                {/* Главное фото */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1.6/1",
                    background: "#f4f9ff",
                    border: images[0]?.url ? "2px solid #2291ff" : "2px dashed #b6d4fc",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: images.length ? "grab" : "pointer",
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 120,
                    marginBottom: 12,
                  }}
                  draggable={!!images[0]}
                  onDragStart={() => handleDragStart(0)}
                  onDragOver={handleDragOver(0)}
                  onDrop={() => handleDrop(0)}
                  onClick={() => !images.length && inputFileRef.current.click()}
                >
                  {images[0]?.url ? (
                    <>
                      <img
                        src={images[0].url}
                        alt="main"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          borderRadius: 10,
                          background: "#fff"
                        }}
                      />
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveImage(images[0].id);
                        }}
                        style={{
                          position: "absolute", top: 7, right: 7,
                          background: "#fff", color: "#f25b5b",
                          border: "none", borderRadius: "50%",
                          width: 24, height: 24, fontWeight: 700,
                          fontSize: 15, boxShadow: "0 2px 8px #2291ff11",
                          cursor: "pointer",
                        }}
                      >×</button>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", color: "#3b7dc6", width: "100%" }}>
                      <img
                        src="https://cdn-icons-png.flaticon.com/128/9068/9068827.png"
                        alt=""
                        style={{ width: 55, margin: "0 auto 8px auto", opacity: 0.15 }}
                      />
                      <div style={{
                        color: "#1977cc", fontWeight: 500, marginBottom: 7, fontSize: 15
                      }}>
                        Завантажте файл или добавьте скопійоване зображення
                      </div>
                      <div style={{ color: "#aac0dd", fontSize: 13, marginBottom: 3 }}>
                        Форматы: JPG, GIF, PNG, WEBP.<br />Максимальный размер: 10 MB.
                      </div>
                      <div style={{ color: "#f87a46", fontSize: 13, marginTop: 3 }}>
                        Без водяных знаков
                      </div>
                    </div>
                  )}
                </div>
                {/* Сетка превью */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  margin: "0 auto",
                  minHeight: 160,
                }}>
                  {/* Мини-фото (до 9) — С DRAG&DROP */}
                  {images.slice(1, 10).map((img, i) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => handleDragStart(i + 1)}
                      onDragOver={handleDragOver(i + 1)}
                      onDrop={() => handleDrop(i + 1)}
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        background: "#f4f9ff",
                        border: "2px solid #2291ff",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "grab",
                        position: "relative",
                        overflow: "hidden",
                        minHeight: 54,
                      }}
                    >
                      <img
                        src={img.url}
                        alt=""
                        style={{
                          width: "100%", height: "100%", objectFit: "cover", borderRadius: 10
                        }}
                      />
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        style={{
                          position: "absolute", top: 5, right: 5,
                          background: "#fff", color: "#f25b5b",
                          border: "none", borderRadius: "50%",
                          width: 18, height: 18, fontWeight: 700,
                          fontSize: 12, boxShadow: "0 2px 8px #2291ff11",
                          cursor: "pointer",
                        }}
                      >×</button>
                    </div>
                  ))}
                  {/* Пустые плюсы (БЕЗ drag&drop, только onClick) */}
                  {Array.from({
                    length: Math.max(0, 9 - Math.min(9, Math.max(0, images.length - 1)))
                  }).map((_, i) => (
                    <div
                      key={i + "plus"}
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        background: "#f4f9ff",
                        border: "2px dashed #dde6f4",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        minHeight: 54,
                      }}
                      onClick={() => inputFileRef.current.click()}
                    >
                      <span style={{ color: "#aac0dd", fontSize: 28, fontWeight: 500 }}>+</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

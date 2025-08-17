import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LocalEditor from "../components/LocalEditor";

const genId = () => Math.random().toString(36).slice(2) + Date.now();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AdminEditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Состояния формы
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("");
  const [hasProps, setHasProps] = useState(false);
  const [propsColor, setPropsColor] = useState("");
  const [queries, setQueries] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("шт");
  const [availability, setAvailability] = useState("published");
  const [stock, setStock] = useState("");
  const [groups, setGroups] = useState([]);
  const [images, setImages] = useState([]);
  const inputFileRef = useRef(null);
  const dragIndex = useRef(null);

  // Загрузка групп
  useEffect(() => {
    fetch(`${API_URL}/api/groups`)
      .then(res => {
        if (!res.ok) throw new Error("Ошибка загрузки групп");
        return res.json();
      })
      .then(data => {
        const flatGroups = [];
        const flatten = (arr) => {
          arr.forEach((g) => {
            if (g.name !== "Родительская группа") flatGroups.push(g);
            if (g.children && g.children.length) flatten(g.children);
          });
        };
        flatten(data);
        setGroups(flatGroups);
      })
      .catch(() => alert("Ошибка загрузки групп"));
  }, []);

  // Загрузка данных товара
  useEffect(() => {
    if (!id) return;
    console.log("Загружаем данные товара с id:", id);
    fetch(`${API_URL}/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}: Товар не найден`);
        return res.json();
      })
      .then(prod => {
        console.log("Получен товар:", prod);
        setName(prod.name || "");
        setSku(prod.sku || "");
        setDescription(prod.description || "");
        setGroup(prod.group || "");
        setHasProps(Boolean(prod.hasProps));
        setPropsColor(prod.propsColor || "");
        setQueries(prod.queries || "");
        setWidth(prod.width || "");
        setHeight(prod.height || "");
        setLength(prod.length || "");
        setWeight(prod.weight || "");
        setPrice(prod.price?.$numberInt ?? prod.price ?? "");
        setUnit(prod.unit || "шт");
        setAvailability(prod.availability || "published");
        setStock(prod.stock || "");
        setImages((prod.images || []).map((url, i) => ({
          id: "srv" + i,
          file: null,
          url: url.startsWith("http") ? url : `${API_URL}${url}`,
          serverUrl: url,
        })));
      })
      .catch(err => {
        alert(err.message);
        navigate("/admin/products");
      });
  }, [id]);

  // Обработка добавления новых фото
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => {
      const prevFiles = prev.map(i => i.file).filter(Boolean);
      const allFiles = [...prevFiles, ...files];
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
      const newImgs = uniqueFiles.map(f => {
        const exist = prev.find(img => img.file && img.file.name === f.name && img.file.size === f.size);
        return exist ? exist : { file: f, url: URL.createObjectURL(f), id: genId() };
      });
      return [
        ...prev.filter(img => img.serverUrl && !img.file),
        ...newImgs
      ];
    });
    if (inputFileRef.current) inputFileRef.current.value = null;
  };

  // Удаление фото
  const handleRemoveImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img && img.file) URL.revokeObjectURL(img.url);
      return prev.filter(i => i.id !== id);
    });
  };

  // Drag & Drop
  const handleDragStart = (idx) => { dragIndex.current = idx; };
  const handleDragOver = (idx) => (e) => { if (dragIndex.current !== null && dragIndex.current !== idx) e.preventDefault(); };
  const handleDrop = (idx) => {
    if (dragIndex.current === null || dragIndex.current === idx) {
      dragIndex.current = null; return;
    }
    setImages(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex.current, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    dragIndex.current = null;
  };

  useEffect(() => {
    return () => {
      images.forEach(img => img.file && URL.revokeObjectURL(img.url));
    };
  }, []);

  // Отправка изменений
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("sku", sku);
    formData.append("description", description);
    formData.append("group", group);
    formData.append("hasProps", hasProps ? "true" : "");
    formData.append("propsColor", propsColor);
    formData.append("queries", queries);
    formData.append("width", width);
    formData.append("height", height);
    formData.append("length", length);
    formData.append("weight", weight);
    formData.append("price", price);
    formData.append("unit", unit);
    formData.append("availability", availability);
    formData.append("stock", stock);

    images.forEach(img => {
      if (img.file) formData.append("images", img.file);
      if (img.serverUrl) formData.append("serverImages[]", img.serverUrl);
    });

    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) throw new Error("Ошибка при сохранении!");
      navigate("/admin/products");
    } catch (err) {
      alert("Ошибка при сохранении позиции: " + err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6fafd", display: "flex", flexDirection: "column", alignItems: "stretch", padding: 0, boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", padding: "0 32px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 4px 18px #1a90ff0b, 0 1.5px 5px #2291ff14", padding: "20px 38px", marginTop: 38, marginBottom: 0, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, minHeight: 64 }}>
          <button
            onClick={() => navigate("/admin/products")}
            style={{ background: "#eaf4ff", color: "#2291ff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, padding: "10px 22px 10px 15px", boxShadow: "0 1px 7px #2291ff11", cursor: "pointer", display: "flex", alignItems: "center", marginLeft: 0, transition: "background 0.18s, color 0.18s" }}
          >
            <span style={{ fontSize: 20, marginRight: 6 }}>←</span> Назад
          </button>
          <button
            type="submit"
            form="edit-prod-form"
            style={{ background: "#2291ff", color: "#fff", borderRadius: 10, border: "none", fontSize: 16, padding: "10px 28px", fontWeight: 800, boxShadow: "0 2px 9px #2291ff13", cursor: "pointer", transition: "background 0.18s, color 0.18s" }}
          >
            Сохранить изменения
          </button>
        </div>

        <form
          id="edit-prod-form"
          onSubmit={handleSubmit}
          style={{ width: "100%", display: "flex", background: "#fff", borderRadius: 14, margin: 0, marginTop: "32px", boxShadow: "0 6px 22px #2291ff0b", padding: "22px 0 0 32px", alignItems: "flex-start", gap: 0, boxSizing: "border-box" }}
        >
          {/* Левая колонка */}
          <div style={{ flex: 2.2, padding: "0px 18px 28px 0px", borderRight: "1.5px solid #eaf1fa", display: "flex", flexDirection: "column", gap: 16, minWidth: 0, boxSizing: "border-box" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
              <div style={{ flex: 1.9 }}>
                <label style={{ fontWeight: 700, fontSize: 15, color: "#223", marginBottom: 3, display: "block" }}>Название позиции</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Название товара" style={{ width: "100%", marginTop: 4, padding: "9px 11px", borderRadius: 9, border: "1.3px solid #c9e4ff", fontSize: 15, background: "#f6fafd", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 700, fontSize: 15, color: "#223", marginBottom: 3, display: "block" }}>Код / Артикул</label>
                <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="Артикул, код" style={{ width: "100%", marginTop: 4, padding: "9px 11px", borderRadius: 9, border: "1.3px solid #c9e4ff", fontSize: 15, background: "#f6fafd", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 15, color: "#223", marginBottom: 4, display: "block" }}>Описание</label>
              <LocalEditor value={description} onChange={setDescription} placeholder="Описание товара..." />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 15, color: "#223", marginBottom: 4, display: "block" }}>Группа</label>
              <select value={group} onChange={e => setGroup(e.target.value)} required style={{ width: "100%", marginTop: 4, padding: "9px 11px", borderRadius: 9, border: "1.3px solid #c9e4ff", fontSize: 15, background: "#f6fafd", boxSizing: "border-box" }}>
                <option value="">Выберите группу</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, marginBottom: 2 }}>
                <input type="checkbox" checked={hasProps} onChange={e => setHasProps(e.target.checked)} style={{ accentColor: "#2291ff" }} />
                Характеристики
              </label>
              {hasProps && (
                <div style={{ marginTop: 7, marginLeft: 7, display: "flex", gap: 10 }}>
                  <input type="text" value={propsColor} onChange={e => setPropsColor(e.target.value)} placeholder="Цвет" style={{ width: "30%", padding: "8px 11px", borderRadius: 7, border: "1.3px solid #c9e4ff", fontSize: 14, background: "#f6fafd", boxSizing: "border-box" }} />
                </div>
              )}
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 15, color: "#223", marginBottom: 4, display: "block" }}>Поисковые запросы</label>
              <input value={queries} onChange={e => setQueries(e.target.value)} placeholder="тормозная накладка, колодки..." style={{ width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 9, border: "1.3px solid #c9e4ff", fontSize: 15, background: "#f6fafd", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={width} onChange={e => setWidth(e.target.value)} placeholder="Ширина (мм)" type="number" style={{ flex: 1, padding: "8px 7px", borderRadius: 8, border: "1.3px solid #c9e4ff", fontSize: 14, background: "#f6fafd", boxSizing: "border-box" }} />
              <input value={height} onChange={e => setHeight(e.target.value)} placeholder="Высота (мм)" type="number" style={{ flex: 1, padding: "8px 7px", borderRadius: 8, border: "1.3px solid #c9e4ff", fontSize: 14, background: "#f6fafd", boxSizing: "border-box" }} />
              <input value={length} onChange={e => setLength(e.target.value)} placeholder="Длина (мм)" type="number" style={{ flex: 1, padding: "8px 7px", borderRadius: 8, border: "1.3px solid #c9e4ff", fontSize: 14, background: "#f6fafd", boxSizing: "border-box" }} />
              <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="Вес (грамм)" type="number" style={{ flex: 1, padding: "8px 7px", borderRadius: 8, border: "1.3px solid #c9e4ff", fontSize: 14, background: "#f6fafd", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} required placeholder="Цена" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.2px solid #c9e4ff", fontSize: 15, background: "#f6fafd", boxSizing: "border-box" }} />
              <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="Ед. изм." style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.2px solid #c9e4ff", fontSize: 15, background: "#f6fafd", boxSizing: "border-box" }} />
              <select value={availability} onChange={e => setAvailability(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.2px solid #c9e4ff", fontSize: 15, background: "#f6fafd", boxSizing: "border-box" }}>
                <option value="published">В наличии</option>
                <option value="order">Под заказ</option>
                <option value="out">Нет в наличии</option>
              </select>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="Остаток" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.2px solid #c9e4ff", fontSize: 15, background: "#f6fafd", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Правая колонка - фото */}
          <div style={{ flex: 1, minWidth: 340, maxWidth: 410, padding: "0px 24px 28px 28px", display: "flex", flexDirection: "column", gap: 15, alignItems: "stretch", marginRight: 0, boxSizing: "border-box" }}>
            <label style={{ fontWeight: 700, color: "#1b2437", fontSize: 15, marginBottom: 3, display: "block" }}>Фото товара</label>
            <div
              style={{ background: "#f8fbff", border: "1.2px dashed #b6d4fc", borderRadius: 11, padding: "13px 8px 16px 8px", minHeight: 255 }}
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
                      style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10, background: "#fff" }}
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
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", color: "#3b7dc6", width: "100%" }}>
                    <img
                      src="https://cdn-icons-png.flaticon.com/128/9068/9068827.png"
                      alt=""
                      style={{ width: 55, margin: "0 auto 8px auto", opacity: 0.15 }}
                    />
                    <div style={{ color: "#1977cc", fontWeight: 500, marginBottom: 7, fontSize: 15 }}>
                      Завантажте файл или добавьте скопійоване зображення
                    </div>
                    <div style={{ color: "#aac0dd", fontSize: 13, marginBottom: 3 }}>
                      Форматы: JPG, GIF, PNG, WEBP.<br />
                      Максимальный размер: 10 MB.
                    </div>
                    <div style={{ color: "#f87a46", fontSize: 13, marginTop: 3 }}>Без водяных знаков</div>
                  </div>
                )}
              </div>

              {/* Сетка превью */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  margin: "0 auto",
                  minHeight: 160,
                }}
              >
                {images.slice(1).map((img, i) => (
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
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
                    />
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveImage(img.id);
                      }}
                      style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        background: "#fff",
                        color: "#f25b5b",
                        border: "none",
                        borderRadius: "50%",
                        width: 18,
                        height: 18,
                        fontWeight: 700,
                        fontSize: 12,
                        boxShadow: "0 2px 8px #2291ff11",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {[...Array(9 - (images.length - 1)).keys()].map((i) => (
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
        </form>
      </div>
    </div>
  );
}

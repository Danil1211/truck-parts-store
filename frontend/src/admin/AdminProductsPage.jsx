import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";

const API_URL = import.meta.env.VITE_API_URL || "https://truck-parts-backend.onrender.com";

export default function AdminProductsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("list");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("");
  const [noPhoto, setNoPhoto] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/groups")
      .then(res => res.json())
      .then(data => {
        const flat = [];
        const flatten = arr => {
          arr.forEach(g => {
            if (g.name !== "Родительская группа") flat.push(g);
            if (g.children && g.children.length) flatten(g.children);
          });
        };
        flatten(data);
        setGroups(flat);
      });
  }, []);

  useEffect(() => {
    if (location.pathname === "/admin/products") setSelected("list");
  }, [location.pathname]);

  useEffect(() => {
    if (!filtersOpen) return;
    const close = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [filtersOpen]);

  const handleEdit = (id) => {
    navigate(`/admin/products/${id}/edit`);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Удалить позицию?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      setProducts(p => p.filter(prod => prod._id !== id));
    } catch {
      alert("Ошибка при удалении позиции");
    }
  };

  const filtered = products.filter(p => {
    if (noPhoto && (!p.images || !p.images.length)) return false;
    if (group !== "all" && p.group !== group) return false;
    if (search && !(p.name?.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.includes(search)))) return false;
    if (status && p.availability !== status) return false;
    return true;
  });

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      minHeight: "calc(100vh - 60px)",
      padding: "38px 0"
    }}>
      <AdminSubMenu selected={selected} setSelected={setSelected} />
      <div style={{
        flex: 1,
        minWidth: 0,
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 2px 12px #2291ff0c",
        padding: "28px 24px"
      }}>
        {selected === "list" && (
          <>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
              marginBottom: 28
            }}>
              <div style={{
                fontWeight: 600,
                fontSize: 28,
                marginRight: 10,
                whiteSpace: "nowrap",
                letterSpacing: 0,
                color: "#1a232b" // фиксированный цвет заголовка
              }}>
                Позиции <span style={{ color: "#2291ff", fontSize: 21, fontWeight: 400 }}>({filtered.length})</span>
              </div>
              <div style={{ position: "relative" }} ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(v => !v)}
                  style={{
                    padding: "11px 24px 11px 22px",
                    borderRadius: 10,
                    background: "#eaf4ff",
                    color: "#2291ff",
                    fontWeight: 400,
                    fontSize: 15,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 7px #2291ff10",
                    whiteSpace: "nowrap"
                  }}
                >Фильтры</button>
                {filtersOpen && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0, top: 48,
                      zIndex: 50,
                      background: "#fff",
                      border: "1.5px solid #dbefff",
                      borderRadius: 14,
                      boxShadow: "0 12px 44px #2291ff11",
                      minWidth: 210,
                      padding: "16px 19px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}
                  >
                    <select
                      value={group}
                      onChange={e => setGroup(e.target.value)}
                      style={{ padding: "7px 13px", borderRadius: 8, border: "1.5px solid #e4e8ee", background: "#f4f7fa", fontSize: 14 }}
                    >
                      <option value="all">Все группы</option>
                      {groups.map(g => (
                        <option key={g._id} value={g._id}>{g.name}</option>
                      ))}
                    </select>
                    <select value={status} onChange={e => setStatus(e.target.value)}
                      style={{ padding: "7px 13px", borderRadius: 8, border: "1.5px solid #e4e8ee", background: "#f4f7fa", fontSize: 14 }}>
                      <option value="">Все</option>
                      <option value="published">В наличии</option>
                      <option value="order">Под заказ</option>
                      <option value="out">Нет на складе</option>
                    </select>
                    <label style={{ display: "flex", alignItems: "center", fontWeight: 400, fontSize: 15, gap: 7 }}>
                      <input type="checkbox" checked={noPhoto} onChange={e => setNoPhoto(e.target.checked)} />
                      Без фото
                    </label>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      style={{
                        background: "#2291ff",
                        color: "#fff",
                        fontWeight: 400,
                        border: "none",
                        borderRadius: 8,
                        padding: "7px 0",
                        marginTop: 5,
                        fontSize: 15,
                        cursor: "pointer",
                        transition: ".12s"
                      }}
                    >Применить</button>
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Поиск по названию или артикулу"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: "9px 15px",
                  borderRadius: 10,
                  border: "1.5px solid #e4e8ee",
                  background: "#f8fbff",
                  fontSize: 15,
                  minWidth: 200,
                  fontWeight: 400,
                  marginTop: 0
                }}
              />
              <button
                style={{
                  background: "#2291ff",
                  color: "#fff",
                  fontWeight: 400,
                  fontSize: 15,
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 21px",
                  marginLeft: "auto",
                  boxShadow: "0 2px 10px #2291ff18",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  marginTop: 0,
                  transition: ".15s"
                }}
                onClick={() => navigate("/admin/products/create")}
              >
                + Добавить позицию
              </button>
            </div>
            <div style={{ height: 12 }}></div>
            {loading
              ? <div style={{ color: "#8ba0b7", textAlign: "center", marginTop: 80 }}>Загрузка...</div>
              : <ProductList products={filtered} onEdit={handleEdit} onDelete={handleDelete} />}
          </>
        )}
      </div>
    </div>
  );
}

function ProductList({ products, onEdit, onDelete }) {
  if (!products.length) {
    return (
      <div style={{ color: "#8ba0b7", fontSize: 17, fontWeight: 400, textAlign: "center", marginTop: 80 }}>
        Нет позиций по выбранным параметрам.
      </div>
    );
  }
  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "94px 1.7fr 1.2fr 1fr 1fr 1.2fr",
        gap: 13,
        padding: "0 0 7px 0",
        fontWeight: 400,
        fontSize: 14,
        color: "#7a91aa",
        borderBottom: "1.5px solid #e7effa",
        marginBottom: 8
      }}>
        <div>Фото</div>
        <div>Название</div>
        <div>Дата</div>
        <div>Код</div>
        <div>Наличие</div>
        <div>Цена</div>
      </div>
      {products.map(p => (
        <ProductRow key={p._id} product={p} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete }) {
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const actionsRef = React.useRef(null);

  useEffect(() => {
    if (!actionsOpen) return;
    function handleClick(e) {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [actionsOpen]);

  const photoUrl =
    product.images && product.images.length
      ? (product.images[0].startsWith("http")
          ? product.images[0]
          : API_URL + product.images[0])
      : "https://dummyimage.com/160x160/eeeeee/222.png&text=Нет+фото";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "94px 1.7fr 1.2fr 1fr 1fr 1.2fr",
        gap: 13,
        alignItems: "center",
        background: "#f7fbff",
        borderRadius: 12,
        marginBottom: 10,
        padding: "12px 0 12px 0",
        fontSize: 15,
        fontWeight: 400,
        boxShadow: "0 1px 6px #2291ff0a"
      }}
    >
      <div>
        <img
          src={photoUrl}
          alt={product.name}
          style={{
            width: 84,
            height: 84,
            objectFit: "cover",
            borderRadius: 14,
            background: "#e9f3fa",
            boxShadow: "0 3px 8px #1a90ff11"
          }}
        />
      </div>
      <div>
        <Link
          to={`/admin/products/${product._id}/edit`}
          style={{
            fontWeight: 500,
            fontSize: 15,
            marginBottom: 3,
            color: "#2291ff",
            textDecoration: "none",
            transition: "color 0.18s",
            cursor: "pointer"
          }}
        >
          {product.name}
        </Link>
      </div>
      <div style={{ color: "#93a1b5", fontSize: 13 }}>
        {product.updatedAt ? new Date(product.updatedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
      </div>
      <div style={{ fontWeight: 500, color: "#2291ff", fontSize: 15 }}>{product.sku}</div>
      <div>
        <span style={{
          fontWeight: 500,
          color: product.availability === "published" ? "#2291ff" : "#f34c4c"
        }}>
          {product.availability === "published" ? "В наличии" : "Нет на складе"}
        </span>
      </div>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 0
      }}>
        <span style={{ fontWeight: 500, fontSize: 15, color: "#252525" }}>{product.price} ₴</span>
        <div style={{ position: "relative" }} ref={actionsRef}>
          <button
            onClick={() => setActionsOpen(v => !v)}
            style={{
              background: "#eaf4ff",
              color: "#2291ff",
              border: "none",
              borderRadius: 10,
              padding: "6px 13px",
              fontWeight: 400,
              fontSize: 14,
              cursor: "pointer",
              minWidth: 0,
              boxShadow: "0 2px 8px #2291ff13"
            }}
          >
            Действия <span style={{ fontSize: 13 }}>▼</span>
          </button>
          {actionsOpen && (
            <div
              style={{
                position: "absolute",
                top: "38px",
                left: 0,
                background: "#fff",
                boxShadow: "0 8px 30px #2291ff17",
                borderRadius: 9,
                border: "1px solid #e3f1ff",
                padding: "4px 0",
                zIndex: 100,
                minWidth: 142,
                display: "flex",
                flexDirection: "column",
                gap: 0
              }}
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: "8px 14px",
                  textAlign: "left",
                  fontWeight: 400,
                  color: "#157ce8",
                  fontSize: 14,
                  cursor: "pointer",
                  width: "100%",
                  borderBottom: "1px solid #f2f4f8",
                  transition: "background 0.13s"
                }}
                onClick={() => { setActionsOpen(false); onEdit(product._id); }}
              >
                Редактировать
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: "8px 14px",
                  textAlign: "left",
                  fontWeight: 400,
                  color: "#e84242",
                  fontSize: 14,
                  cursor: "pointer",
                  width: "100%",
                  transition: "background 0.13s"
                }}
                onClick={() => { setActionsOpen(false); onDelete(product._id); }}
              >
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

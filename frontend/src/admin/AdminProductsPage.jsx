// frontend/src/admin/AdminProductsPage.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

// контекст для доступа к списку групп
const GroupsContext = React.createContext([]);

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

  const [quotaOpen, setQuotaOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [prodsRes, groupsRes] = await Promise.all([
          api.get("/api/products"),
          api.get("/api/groups"),
        ]);

        const data = prodsRes.data;
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);

        const groupsData = groupsRes.data || [];
        const flat = [];
        const flatten = (arr) => {
          arr.forEach((g) => {
            if (g.name !== "Родительская группа") flat.push(g);
            if (g.children && g.children.length) flatten(g.children);
          });
        };
        flatten(groupsData);
        setGroups(flat);
      } catch (e) {
        setLoading(false);
        console.error("Failed to load products/groups:", e);
      }
    })();
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

  const handleEdit = (id) => navigate(`/admin/products/${id}/edit`);

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить позицию?")) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts((p) => p.filter((prod) => prod._id !== id));
    } catch (e) {
      console.error("Delete product failed:", e);
      alert("Ошибка при удалении позиции");
    }
  };

  const filtered = products.filter((p) => {
    if (noPhoto && (!p.images || !p.images.length)) return false;
    if (group !== "all" && String(p.group?._id || p.group) !== group) return false;
    if (
      search &&
      !(p.name?.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.includes(search)))
    )
      return false;
    if (status && p.availability !== status) return false;
    return true;
  });

  // считаем процент для тарифа Free (1000 позиций)
  const percent = Math.min((filtered.length / 1000) * 100, 100);
  let quotaColor = "#0a84ff"; // blue
  if (percent >= 95) quotaColor = "#ef4444"; // red
  else if (percent >= 80) quotaColor = "#f59e0b"; // orange

  return (
    <div className="products-page">
      <AdminSubMenu type="products" activeKey={selected} onSelect={setSelected} />

      {/* Вертикальный прогресс-бар тарифа */}
      {!loading && (
        <div className="quota-progress" onClick={() => setQuotaOpen(true)}>
          <div className="quota-bar-vertical">
            <div
              className="quota-fill-vertical"
              style={{
                height: `${percent}%`,
                background: quotaColor,
              }}
            ></div>
          </div>
          <span className="quota-text-vertical">{Math.round(percent)}%</span>
        </div>
      )}

      {/* Панель с лимитом */}
      {quotaOpen && (
        <div className="quota-overlay" onClick={() => setQuotaOpen(false)}>
          <div className="quota-panel" onClick={(e) => e.stopPropagation()}>
            <button className="quota-close" onClick={() => setQuotaOpen(false)}>×</button>
            <h3 className="quota-title">Добавлено: {filtered.length}</h3>
            <div className="quota-sub">Лимит товаров: 1000</div>

            <ul className="quota-list">
              <li>🔵 Добавлено: {filtered.length}</li>
              <li>🟢 Опубликовано: {filtered.filter(p => p.status === "published").length}</li>
            </ul>

            <div className="quota-remaining">
              Можно добавить ещё {1000 - filtered.length} товаров.
            </div>
          </div>
        </div>
      )}

      {/* Фиксированный хедер */}
      <div className="products-header">
        <div className="products-header-left">
          <div className="products-h1" style={{ order: 0 }}>
            Позиции <span className="products-count">({filtered.length})</span>
          </div>

          <div className="filters" ref={filterRef} style={{ order: 1 }}>
            <button className="filters-toggle" onClick={() => setFiltersOpen((v) => !v)}>
              Фильтры
            </button>

            {filtersOpen && (
              <div className="filters-popover">
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="filters-select"
                >
                  <option value="all">Все группы</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="filters-select"
                >
                  <option value="">Все</option>
                  <option value="published">В наличии</option>
                  <option value="order">Под заказ</option>
                  <option value="out">Нет на складе</option>
                </select>

                <label className="filters-check">
                  <input
                    type="checkbox"
                    checked={noPhoto}
                    onChange={(e) => setNoPhoto(e.target.checked)}
                  />
                  Без фото
                </label>

                <button className="filters-apply" onClick={() => setFiltersOpen(false)}>
                  Применить
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Поиск…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="products-search-compact"
            style={{ marginLeft: 0 }}
          />
        </div>

        <div className="products-header-right">
          <button className="btn-primary" onClick={() => navigate("/admin/products/create")}>
            <span className="plus-icon">+</span> Добавить товар
          </button>
        </div>
      </div>

      {/* Контент */}
      <div className="products-content-wrap">
        <div className="products-content">
          {selected === "list" && (
            <>
              {loading ? (
                <div className="loader-wrap">
                  <div className="loader"></div>
                </div>
              ) : (
                <GroupsContext.Provider value={{ groups }}>
                  <ProductList products={filtered} onEdit={handleEdit} onDelete={handleDelete} />
                </GroupsContext.Provider>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================== ProductList + ProductRow ================== */
function ProductList({ products, onEdit, onDelete }) {
  const [selectedIds, setSelectedIds] = React.useState([]);
  const allSelected = products.length > 0 && selectedIds.length === products.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(products.map((p) => p._id));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="products-list-wrap">
      {/* заголовок для массовых действий */}
      <div className="products-bulk-header">
        <label className="apple-checkbox">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          <span />
        </label>
        {selectedIds.length > 0 && (
          <div className="bulk-actions">
            Действия для {selectedIds.length} позиций ▾
            <div className="bulk-menu">
              <button
                onClick={() => {
                  selectedIds.forEach((id) => onDelete(id));
                  setSelectedIds([]);
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        )}
      </div>

      {products.map((p) => (
        <ProductRow
          key={p._id}
          product={p}
          selected={selectedIds.includes(p._id)}
          onToggle={() => toggleOne(p._id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function ProductRow({ product, selected, onToggle, onEdit, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const { groups } = React.useContext(GroupsContext);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const photoUrl =
    product.images && product.images.length
      ? (product.images[0].startsWith("http") ? product.images[0] : `${BASE_URL}${product.images[0]}`)
      : "https://dummyimage.com/160x160/eeeeee/222.png&text=Нет+фото";

  // имя группы
  let groupName = "—";
  if (typeof product.group === "object" && product.group?.name) {
    groupName = product.group.name;
  } else if (typeof product.group === "string") {
    const found = groups.find((g) => g._id === product.group);
    if (found) groupName = found.name;
  }

  return (
    <div className="product-row">
      {/* чекбокс */}
      <div className="cell-check">
        <label className="apple-checkbox">
          <input type="checkbox" checked={selected} onChange={onToggle} />
          <span />
        </label>
      </div>

      {/* фото */}
      <div className="cell-photo">
        <img className="product-photo" src={photoUrl} alt={product.name} />
      </div>

      {/* название + группа */}
      <div className="cell-name">
        <Link to={`/admin/products/${product._id}/edit`} className="product-link two-lines">
          {product.name || "—"}
        </Link>
        <div className="product-group">{groupName}</div>
      </div>

      {/* дата */}
      <div className="cell-date product-date">
        {product.updatedAt
          ? new Date(product.updatedAt).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })
          : "—"}
      </div>

      {/* код */}
      <div className="cell-sku product-sku">{product.sku || "—"}</div>

      {/* наличие + статус публикации */}
      <div className="cell-state">
        <span
          className={
            "avail " +
            (product.availability === "published"
              ? "published"
              : product.availability === "order"
              ? "order"
              : "out")
          }
        >
          {product.availability === "published"
            ? "В наличии"
            : product.availability === "order"
            ? "Под заказ"
            : "Нет на складе"}
        </span>

        <span className={`pub ${product.status === "published" ? "on" : "off"}`}>
          {product.status === "published" ? "Опубликован" : "Скрытый"}
        </span>
      </div>

      {/* цена */}
      <div className="cell-price">
        <span className="product-price">{product.price} ₴</span>
      </div>

      {/* действия */}
      <div className="cell-actions">
        <div className="actions" ref={ref}>
          <button className="actions-toggle" onClick={() => setOpen((v) => !v)}>
            ▾
          </button>
          {open && (
            <div className="actions-menu">
              <button className="actions-item edit" onClick={() => onEdit(product._id)}>
                Редактировать
              </button>
              <button className="actions-item delete" onClick={() => onDelete(product._id)}>
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

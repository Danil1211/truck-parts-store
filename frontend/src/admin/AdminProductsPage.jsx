// frontend/src/admin/AdminProductsPage.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

// контекст для доступа к списку групп
const GroupsContext = React.createContext([]);

/* ================== Мини-компонент EditableCell ==================
   - Поддерживает text / number / select
   - Карандаш (SVG) виден только при ховере строки (showEditIcon)
   - Сохраняет по blur или Enter; Esc — отмена
   - Ничего не ломает: можно отдать кастомный renderDisplay (например, Link)
=================================================================== */
function EditableCell({
  value,
  onSave,
  type = "text",
  options = [],
  renderDisplay,       // (val) => ReactNode
  showEditIcon = false // приходит от ProductRow при ховере строки
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commit = () => {
    setEditing(false);
    let v = draft;
    if (type === "number") {
      const n = Number(String(draft).toString().replace(",", "."));
      if (!Number.isNaN(n)) v = n;
    }
    if (v !== value) onSave(v);
  };

  if (editing) {
    if (type === "select") {
      return (
        <select
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          className="editable-input"
          style={{
            height: 32,
            borderRadius: 10,
            border: "1.5px solid #d0d7e2",
            background: "#f9fbfd",
            padding: "0 10px",
            fontSize: 14,
            outline: "none",
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={type}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="editable-input"
        style={{
          height: 32,
          borderRadius: 10,
          border: "1.5px solid #d0d7e2",
          background: "#f9fbfd",
          padding: "0 10px",
          fontSize: 14,
          outline: "none",
          maxWidth: type === "number" ? 120 : "100%",
        }}
      />
    );
  }

  return (
    <span
      className="editable-cell"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}
    >
      <span style={{ minWidth: 0 }}>
        {renderDisplay ? renderDisplay(value) : <span>{value ?? "—"}</span>}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="edit-btn"
        aria-label="Изменить"
        title="Изменить"
        style={{
          opacity: showEditIcon ? 1 : 0,
          transition: "opacity .18s ease",
          background: "transparent",
          border: "1px solid transparent",
          padding: 4,
          borderRadius: 8,
          cursor: "pointer",
          lineHeight: 0,
        }}
      >
        {/* минималистичный SVG-карандаш */}
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "#64748b" }}
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
    </span>
  );
}

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

  // ВАЖНО: сохраняем только поле, но на бэкенд отправляем ПОЛНЫЙ текущий товар,
  // чтобы сервер ничего не затёр (фото, sku и др. остаются).
  const handleEditField = async (id, field, value) => {
    const current = products.find((p) => p._id === id);
    if (!current) return;

    // берём все текущие поля из фронта и убираем служебные
    const {
      _id, __v, createdAt, updatedAt, ordersCount, // не отправляем
      ...rest
    } = current;

    // если group объект — отправим его id
    if (rest.group && typeof rest.group === "object" && rest.group._id) {
      rest.group = rest.group._id;
    }

    // подменяем редактируемое поле
    const payload = { ...rest, [field]: value };

    try {
      // используем PUT, раз сервер, похоже, перезаписывает документ
      await api.put(`/api/products/${id}`, payload);
      // локально меняем ТОЛЬКО поле
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, [field]: value } : p))
      );
    } catch (e) {
      console.error("Ошибка при сохранении:", e);
      alert("Не удалось сохранить изменения");
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
              style={{ height: `${percent}%`, background: quotaColor }}
            />
          </div>
          <span className="quota-text-vertical">{Math.round(percent)}%</span>
        </div>
      )}

      {/* Панель с лимитом */}
      {quotaOpen && (
        <div className="quota-overlay" onClick={() => setQuotaOpen(false)}>
          <div className="quota-panel" onClick={(e) => e.stopPropagation()}>
            <button className="quota-close" onClick={() => setQuotaOpen(false)}>×</button>

            <h3 className="quota-title">Добавлено {Math.round(percent)}% товаров</h3>
            <hr className="quota-divider" />

            <div className="quota-details">
              <div><strong>Лимит товаров:</strong> 1000</div>
              <div>• <strong>Добавлено:</strong> {filtered.length} з 1000</div>
              <div>• <strong>Опубликовано:</strong> {filtered.filter(p => p.status === "published").length} з 1000</div>
            </div>

            <div className="quota-remaining">
              Можно добавить еще: {1000 - filtered.length} товаров
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
                    <option key={g._id} value={g._id}>{g.name}</option>
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
                <div className="loader-wrap"><div className="loader" /></div>
              ) : (
                <GroupsContext.Provider value={{ groups }}>
                  <ProductList
                    products={filtered}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onEditField={handleEditField}
                  />
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
function ProductList({ products, onEdit, onDelete, onEditField }) {
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
      {/* верхняя строка */}
      {selectedIds.length > 0 ? (
        <div className="products-bulk-header">
          <div className="cell-check">
            <label className="apple-checkbox">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span />
            </label>
          </div>
          <div className="cell-photo"></div>
          <div className="cell-name">
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
          <div className="cell-date"></div>
          <div className="cell-sku"></div>
          <div className="cell-state"></div>
          <div className="cell-price"></div>
          <div className="cell-orders"></div>
          <div className="cell-actions"></div>
        </div>
      ) : (
        <div className="products-grid-header">
          <div className="cell-check">
            <label className="apple-checkbox">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span />
            </label>
          </div>
          <div className="cell-photo"></div>
          <div className="cell-name">Название</div>
          <div className="cell-date">Дата</div>
          <div className="cell-sku">Код</div>
          <div className="cell-state">Отображение</div>
          <div className="cell-price">Цена</div>
          <div className="cell-orders">Заказы</div>
          <div className="cell-actions"></div>
        </div>
      )}

      {/* товары */}
      {products.map((p) => (
        <ProductRow
          key={p._id}
          product={p}
          selected={selectedIds.includes(p._id)}
          onToggle={() => toggleOne(p._id)}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditField={onEditField}
        />
      ))}
    </div>
  );
}

function ProductRow({ product, selected, onToggle, onEdit, onDelete, onEditField }) {
  const [open, setOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
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

  let groupName = "—";
  if (typeof product.group === "object" && product.group?.name) {
    groupName = product.group.name;
  } else if (typeof product.group === "string") {
    const found = groups.find((g) => g._id === product.group);
    if (found) groupName = found.name;
  }

  return (
    <div
      className="product-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="cell-check">
        <label className="apple-checkbox">
          <input type="checkbox" checked={selected} onChange={onToggle} />
          <span />
        </label>
      </div>

      <div className="cell-photo">
        <img className="product-photo" src={photoUrl} alt={product.name} />
      </div>

      <div className="cell-name" style={{ minWidth: 0 }}>
        <EditableCell
          value={product.name || "—"}
          showEditIcon={hovered}
          onSave={(val) => onEditField(product._id, "name", val)}
          renderDisplay={(val) => (
            <Link
              to={`/admin/products/${product._id}/edit`}
              className="product-link two-lines"
              style={{ display: "inline-block", verticalAlign: "top" }}
            >
              {val || "—"}
            </Link>
          )}
        />
        <div className="product-group">{groupName}</div>
      </div>

      <div className="cell-date product-date">
        {product.updatedAt
          ? new Date(product.updatedAt).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })
          : "—"}
      </div>

      <div className="cell-sku">
        <EditableCell
          value={product.sku || "—"}
          showEditIcon={hovered}
          onSave={(val) => onEditField(product._id, "sku", val)}
          renderDisplay={(val) => <span className="product-sku">{val || "—"}</span>}
        />
      </div>

      <div className="cell-state" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* availability */}
        <EditableCell
          value={product.availability}
          type="select"
          showEditIcon={hovered}
          options={[
            { value: "published", label: "В наличии" },
            { value: "order", label: "Под заказ" },
            { value: "out", label: "Нет на складе" },
          ]}
          onSave={(val) => onEditField(product._id, "availability", val)}
          renderDisplay={(val) => (
            <span
              className={
                "avail " +
                (val === "published" ? "published" : val === "order" ? "order" : "out")
              }
            >
              {val === "published" ? "В наличии" : val === "order" ? "Под заказ" : "Нет на складе"}
            </span>
          )}
        />
        {/* status (опубликован/скрытый) */}
        <EditableCell
          value={product.status}
          type="select"
          showEditIcon={hovered}
          options={[
            { value: "published", label: "Опубликован" },
            { value: "hidden", label: "Скрытый" },
          ]}
          onSave={(val) => onEditField(product._id, "status", val)}
          renderDisplay={(val) => (
            <span className={`pub ${val === "published" ? "on" : "off"}`}>
              {val === "published" ? "Опубликован" : "Скрытый"}
            </span>
          )}
        />
      </div>

      <div className="cell-price">
        <EditableCell
          value={product.price}
          type="number"
          showEditIcon={hovered}
          onSave={(val) => onEditField(product._id, "price", val)}
          renderDisplay={(val) => (
            <span className="product-price">
              {val !== undefined && val !== null ? val : "—"} ₴
            </span>
          )}
        />
      </div>

      <div className="cell-orders">
        <span className="orders-badge">{product.ordersCount ?? 0}</span>
      </div>

      <div className="cell-actions">
        <div className="actions" ref={ref}>
          <button className="actions-toggle" onClick={() => setOpen((v) => !v)}>
            Действия ▾
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

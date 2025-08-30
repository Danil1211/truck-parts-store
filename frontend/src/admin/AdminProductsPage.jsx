// frontend/src/admin/AdminProductsPage.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

// localStorage keys
const LS_FILTERS_KEY = "admin.products.filters";
const LS_PER_PAGE_KEY = "admin.products.perPage";

// контекст групп
const GroupsContext = React.createContext({ groups: [] });

/* ================= EditableCell ================= */
function EditableCell({
  value,
  onSave,
  type = "text",
  options = [],
  renderDisplay,
  showEditIcon = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => setDraft(value ?? ""), [value]);

  const commit = () => {
    setEditing(false);
    let v = draft;
    if (type === "number") {
      const n = Number(String(draft).replace(",", "."));
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
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
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
    <span className="editable-cell" style={{ display: "inline-flex", alignItems: "center" }}>
      {renderDisplay ? renderDisplay(value) : <span>{value ?? "—"}</span>}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="edit-btn"
        aria-label="Изменить"
        style={{
          opacity: showEditIcon ? 1 : 0,
          transition: "opacity .18s ease",
          background: "transparent",
          border: "1px solid transparent",
          padding: 2,
          marginLeft: 6,
          borderRadius: 6,
          cursor: "pointer",
          lineHeight: 0,
          color: "#64748b",
        }}
        title="Редактировать"
      >
        {/* svg-карандаш */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
    </span>
  );
}

/* ================= AdminProductsPage ================= */
export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("list");

  // init filters
  const initialFilters = (() => {
    try {
      return JSON.parse(localStorage.getItem(LS_FILTERS_KEY) || "{}");
    } catch {
      return {};
    }
  })();

  const [search, setSearch] = useState(initialFilters.search || "");
  const [group, setGroup] = useState(initialFilters.group || "all");
  const [status, setStatus] = useState(initialFilters.status || "");
  const [noPhoto, setNoPhoto] = useState(Boolean(initialFilters.noPhoto));

  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const groupNameById = useCallback(
    (id) => groups.find((x) => x._id === id)?.name || "—",
    [groups]
  );

  // load data
  useEffect(() => {
    (async () => {
      try {
        const [prodsRes, groupsRes] = await Promise.all([
          api.get("/api/products/admin"),
          api.get("/api/groups"),
        ]);

        setProducts(Array.isArray(prodsRes.data) ? prodsRes.data : []);
        setLoading(false);

        const flat = [];
        const flatten = (arr) => {
          arr.forEach((g) => {
            if (g.name !== "Родительская группа") flat.push(g);
            if (g.children?.length) flatten(g.children);
          });
        };
        flatten(groupsRes.data || []);
        setGroups(flat);
      } catch (e) {
        setLoading(false);
        console.error("Failed to load products/groups:", e);
      }
    })();
  }, []);

  // save filters
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_FILTERS_KEY,
        JSON.stringify({ search, group, status, noPhoto })
      );
    } catch {}
  }, [search, group, status, noPhoto]);

  // close filters popover
  useEffect(() => {
    if (!filtersOpen) return;
    const onDocClick = (e) => {
      const popover = filterRef.current;
      const inside = popover && popover.contains(e.target);
      const onToggle = !!e.target.closest(".filters-toggle");
      if (!inside && !onToggle) setFiltersOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setFiltersOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [filtersOpen]);

  const handleEdit = (id) => navigate(`/admin/products/${id}/edit`);

  const handleDelete = async (id, opts = {}) => {
    if (!opts.silent && !window.confirm("Удалить позицию?")) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts((p) => p.filter((prod) => prod._id !== id));
    } catch (e) {
      console.error("Delete product failed:", e);
      if (!opts.silent) alert("Ошибка при удалении позиции");
    }
  };

  const handleEditField = async (id, field, value) => {
    try {
      await api.patch(`/api/products/${id}`, { [field]: value });
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, [field]: value } : p))
      );
    } catch (e) {
      console.error("Ошибка при сохранении:", e);
      alert("Не удалось сохранить изменения");
    }
  };

  // quick filter by group from row click
  const handleQuickFilterGroup = useCallback((groupId) => {
    if (!groupId) return;
    setGroup(String(groupId));
  }, []);

  // filtering pipeline
  const filtered = products.filter((p) => {
    if (noPhoto && (!p.images || !p.images.length)) return false;
    if (group !== "all" && String(p.group?._id || p.group) !== group) return false;

    const normalize = (s) =>
      (s ?? "").toString().replace(/\u00A0/g, " ").toLowerCase().trim();
    const normalizeNoSpaces = (s) => normalize(s).replace(/\s+/g, "");

    const q = normalize(search);
    const qNoSpaces = normalizeNoSpaces(search);

    if (q) {
      const name = normalize(p.name);
      const sku = normalize(p.sku);
      const skuNoSpaces = normalizeNoSpaces(p.sku);
      if (!name.includes(q) && !(sku.includes(q) || skuNoSpaces.includes(qNoSpaces)))
        return false;
    }

    if (status && (p.status || p.availability) !== status) return false;
    return true;
  });

  return (
    <div className="products-page">
      <AdminSubMenu type="products" activeKey={selected} onSelect={setSelected} />

      {/* Header */}
      <div className="products-header">
        <div className="products-header-left">
          <div className="products-h1">
            Позиции <span className="products-count">({filtered.length})</span>
          </div>

          {/* Filters */}
          <div className="filters">
            <button className="filters-toggle" onClick={() => setFiltersOpen((v) => !v)}>
              Фильтры
            </button>

            {filtersOpen && (
              <div className="filters-popover" ref={filterRef}>
                <select
                  value={group}
                  onChange={(e) => {
                    setGroup(e.target.value);
                    setFiltersOpen(false);
                  }}
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
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setFiltersOpen(false);
                  }}
                  className="filters-select"
                >
                  <option value="">Все статусы</option>
                  <option value="published">Опубликован</option>
                  <option value="hidden">Скрытый</option>
                </select>

                <label className="filters-check">
                  <input
                    type="checkbox"
                    checked={noPhoto}
                    onChange={(e) => {
                      setNoPhoto(e.target.checked);
                      setFiltersOpen(false);
                    }}
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
          />
        </div>

        <div className="products-header-right">
          <button className="btn-primary" onClick={() => navigate("/admin/products/create")}>
            <span className="plus-icon">+</span> Добавить товар
          </button>
        </div>
      </div>

      {/* Active chips */}
      {!loading && (group !== "all" || status || noPhoto) && (
        <div className="products-chips-row">
          {group !== "all" && (
            <button type="button" className="filter-chip" onClick={() => setGroup("all")} title="Сбросить фильтр группы">
              Группа: {groupNameById(group)} <span aria-hidden>×</span>
            </button>
          )}
          {status && (
            <button type="button" className="filter-chip" onClick={() => setStatus("")} title="Сбросить фильтр статуса">
              {status === "published" ? "Опубликован" : "Скрытый"} <span aria-hidden>×</span>
            </button>
          )}
          {noPhoto && (
            <button type="button" className="filter-chip" onClick={() => setNoPhoto(false)} title="Сбросить фильтр «Без фото»">
              Без фото <span aria-hidden>×</span>
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="products-content">
        {selected === "list" && (
          <>
            {loading ? (
              <div className="loader-wrap">
                <div className="loader" />
              </div>
            ) : (
              <GroupsContext.Provider value={{ groups }}>
                <ProductList
                  products={filtered}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onEditField={handleEditField}
                  onQuickFilterGroup={handleQuickFilterGroup}
                  activeGroup={group}
                />
              </GroupsContext.Provider>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ================= ProductList ================= */
function ProductList({ products, onEdit, onDelete, onEditField, onQuickFilterGroup, activeGroup }) {
  const [selectedIds, setSelectedIds] = useState([]);

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    const saved = Number(localStorage.getItem(LS_PER_PAGE_KEY));
    return [10, 20, 50, 100].includes(saved) ? saved : 20;
  });

  useEffect(() => localStorage.setItem(LS_PER_PAGE_KEY, String(perPage)), [perPage]);
  useEffect(() => setPage(1), [products.length, perPage]);

  const paginated = products.slice((page - 1) * perPage, page * perPage);
  const idsOnPage = paginated.map((p) => p._id);
  const allSelected = paginated.length > 0 && idsOnPage.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds((prev) => prev.filter((id) => !idsOnPage.includes(id)));
    else setSelectedIds((prev) => Array.from(new Set([...prev, ...idsOnPage])));
  };
  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (products.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "120px 20px", fontSize: 18, color: "#8e9baa", fontWeight: 400 }}>
        Нет товаров
      </div>
    );
  }

  return (
    <div className="products-list-wrap">
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
        <div className="cell-actions"></div>
      </div>

      {paginated.map((p) => (
        <ProductRow
          key={p._id}
          product={p}
          selected={selectedIds.includes(p._id)}
          onToggle={() => toggleOne(p._id)}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditField={onEditField}
          onQuickFilterGroup={onQuickFilterGroup}
          activeGroup={activeGroup}
        />
      ))}

      <Pagination
        total={products.length}
        perPage={perPage}
        page={page}
        onPageChange={setPage}
        onPerPageChange={(n) => {
          setPerPage(n);
          setPage(1);
        }}
      />
    </div>
  );
}

/* ================= ProductRow ================= */
function ProductRow({
  product,
  selected,
  onToggle,
  onEdit,
  onDelete,
  onEditField,
  onQuickFilterGroup,
  activeGroup,
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const { groups } = React.useContext(GroupsContext);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const photoUrl =
    product.images?.length
      ? (product.images[0].startsWith("http") ? product.images[0] : `${BASE_URL}${product.images[0]}`)
      : "https://dummyimage.com/160x160/eeeeee/222.png&text=Нет+фото";

  // группа (id + имя)
  let groupName = "—";
  let groupIdValue = null;
  if (typeof product.group === "object" && product.group?._id) {
    groupIdValue = product.group._id;
    groupName = product.group.name || "—";
  } else if (typeof product.group === "string") {
    groupIdValue = product.group;
    groupName = groups.find((g) => g._id === product.group)?.name || "—";
  }
  const canQuickFilter = Boolean(groupIdValue);
  const isActiveGroup = canQuickFilter && String(activeGroup) !== "all" && String(activeGroup) === String(groupIdValue);

  // публикация/видимость
  const pubStatus = product.status ?? (product.availability === "hidden" ? "hidden" : "published");

  // ===== цена по схеме =====
  const currency = product.retailCurrency || "UAH";
  const currencySign = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₴";

  const renderPriceDisplay = () => {
    const mode = product.priceMode || "retail";
    if (mode === "service") return <span className="product-price">Услуга</span>;
    if (mode === "retail") {
      const val = Number(product.retailPrice ?? 0) || 0;
      const text = `${val ? val.toLocaleString("ru-RU") : "—"} ${currencySign}`;
      return (
        <span className="product-price">
          {product.priceFromFlag ? "от " : ""}
          {text}
        </span>
      );
    }
    if (mode === "both") {
      const val = Number(product.retailPrice ?? 0) || 0;
      const retail = `${val ? val.toLocaleString("ru-RU") : "—"} ${currencySign}`;
      const opt = Array.isArray(product.wholesaleTiers) && product.wholesaleTiers.length
        ? ` • опт от ${product.wholesaleTiers[0].minQty}шт: ${product.wholesaleTiers[0].price} ${(product.wholesaleTiers[0].currency || currency)}`
        : "";
      return <span className="product-price">{retail}{opt}</span>;
    }
    if (mode === "wholesale") {
      if (!Array.isArray(product.wholesaleTiers) || !product.wholesaleTiers.length) return <span className="product-price">—</span>;
      return (
        <span className="product-price">
          {product.wholesaleTiers.map((t, i) => (
            <span key={i}>
              {i ? ", " : ""}
              от {t.minQty}шт: {t.price} {t.currency || currency}
            </span>
          ))}
        </span>
      );
    }
    return <span className="product-price">—</span>;
  };

  return (
    <div className="product-row" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
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
            <Link to={`/admin/products/${product._id}/edit`} className="product-link two-lines" style={{ display: "inline-block", verticalAlign: "top" }}>
              {val || "—"}
            </Link>
          )}
        />
        <div className="product-group">
          {canQuickFilter ? (
            <button
              type="button"
              title={`Показать товары группы: ${groupName}`}
              onClick={() => onQuickFilterGroup(groupIdValue)}
              className={`product-group-btn${isActiveGroup ? " active" : ""}`}
            >
              {groupName}
            </button>
          ) : (
            <span style={{ color: "#8ea0b3", fontSize: "12.5px" }}>{groupName}</span>
          )}
        </div>
      </div>

      <div className="cell-date product-date">
        {product.updatedAt
          ? new Date(product.updatedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
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
        {/* Наличие (availability) */}
        <EditableCell
          value={product.availability}
          type="select"
          showEditIcon={hovered}
          options={[
            { value: "published", label: "В наличии" },
            { value: "order", label: "Под заказ" },
            { value: "out", label: "Нет на складе" },
            { value: "hidden", label: "Скрыт" },
          ]}
          onSave={(val) => onEditField(product._id, "availability", val)}
          renderDisplay={(val) => {
            const label =
              val === "published" ? "В наличии" :
              val === "order" ? "Под заказ" :
              val === "out" ? "Нет на складе" :
              val === "hidden" ? "Скрыт" : val || "—";
            const cls =
              val === "published" ? "published" :
              val === "order" ? "order" :
              val === "out" ? "out" : "hidden";
            return <span className={"avail " + cls}>{label}</span>;
          }}
        />

        {/* Публикация (status) — если поля нет, просто показываем из availability */}
        <EditableCell
          value={pubStatus}
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
        {/* Редактируем только retailPrice (как основную цену) */}
        <EditableCell
          value={Number(product.retailPrice ?? 0) || 0}
          type="number"
          showEditIcon={hovered}
          onSave={(val) => onEditField(product._id, "retailPrice", val)}
          renderDisplay={() => renderPriceDisplay()}
        />
      </div>

      <div className="cell-actions">
        <div className="actions" ref={ref}>
          <button className="actions-toggle" onClick={() => setOpen((v) => !v)}>Действия ▾</button>
          {open && (
            <div className="actions-menu">
              <button className="actions-item edit" onClick={() => onEdit(product._id)}>Редактировать</button>
              <button className="actions-item delete" onClick={() => onDelete(product._id)}>Удалить</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= Pagination ================= */
function Pagination({ total, perPage, page, onPageChange, onPerPageChange }) {
  const pages = Math.ceil(total / perPage);
  const changePage = (p) => {
    if (p < 1 || p > pages) return;
    onPageChange(p);
  };

  const getRange = () => {
    let arr = [];
    if (pages <= 7) arr = Array.from({ length: pages }, (_, i) => i + 1);
    else {
      if (page <= 3) arr = [1, 2, 3, "...", pages];
      else if (page >= pages - 2) arr = [1, "...", pages - 2, pages - 1, pages];
      else arr = [1, "...", page - 1, page, page + 1, "...", pages];
    }
    return arr;
  };

  return (
    <div className="pagination-wrap">
      <div className="pagination">
        <button className="page-btn" disabled={page === 1} onClick={() => changePage(page - 1)}>‹</button>
        {getRange().map((p, i) =>
          p === "..." ? (
            <span key={i} className="dots">…</span>
          ) : (
            <button key={i} className={`page-btn ${p === page ? "active" : ""}`} onClick={() => changePage(p)}>
              {p}
            </button>
          )
        )}
        <button className="page-btn" disabled={page === pages} onClick={() => changePage(page + 1)}>›</button>
      </div>

      <select
        className="page-size"
        value={perPage}
        onChange={(e) => {
          onPerPageChange(Number(e.target.value));
          onPageChange(1);
        }}
      >
        {[10, 20, 50, 100].map((n) => (
          <option key={n} value={n}>
            по {n} позиций
          </option>
        ))}
      </select>
    </div>
  );
}

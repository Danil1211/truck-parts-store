import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

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
    if (noPhoto && (p.images && p.images.length)) return false;
    if (group !== "all" && String(p.group?._id || p.group) !== group) return false;
    if (
      search &&
      !(
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
      )
    ) {
      return false;
    }
    if (status && p.availability !== status) return false;
    return true;
  });

  // карта id->name для групп (чтобы показывать имя даже если в продукте group = ObjectId)
  const groupById = useMemo(() => {
    const map = {};
    for (const g of groups) map[String(g._id)] = g.name;
    return map;
  }, [groups]);

  return (
    <div className="products-page">
      <AdminSubMenu type="products" activeKey={selected} onSelect={setSelected} />

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
                  Только без фото
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

      <div className="products-content-wrap">
        <div className="products-content">
          {selected === "list" && (
            <>
              {loading ? (
                <div className="products-empty muted">Загрузка...</div>
              ) : (
                <ProductList
                  products={filtered}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  groupById={groupById}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductList({ products, onEdit, onDelete, groupById }) {
  if (!products.length) {
    return <div className="products-empty">Нет позиций по выбранным параметрам.</div>;
  }
  return (
    <div>
      <div className="products-grid-header">
        <div>Фото</div>
        <div>Название / Группа</div>
        <div>Дата</div>
        <div>Код</div>
        <div>Наличие / Отображение</div>
        <div>Цена</div>
        <div>Заказы</div>
        <div>Действия</div>
      </div>

      {products.map((p) => (
        <ProductRow
          key={p._id}
          product={p}
          onEdit={onEdit}
          onDelete={onDelete}
          groupById={groupById}
        />
      ))}
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete, groupById }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const photoUrl =
    product.images && product.images.length
      ? product.images[0].startsWith("http")
        ? product.images[0]
        : `${BASE_URL}${product.images[0]}`
      : "https://dummyimage.com/140x140/eeeeee/222.png&text=Нет+фото";

  const isPublished =
    typeof product.isPublished === "boolean"
      ? product.isPublished
      : typeof product.published === "boolean"
      ? product.published
      : product.visibility
      ? product.visibility === "published"
      : true;

  const availability = product.availability || ""; // 'published' | 'order' | 'out'
  const availabilityLabel =
    availability === "published" ? "В наличии" : availability === "order" ? "Под заказ" : "Нет на складе";

  const ordersCount =
    product.ordersCount ??
    product.orderCount ??
    (product.stats && product.stats.orders) ??
    0;

  const groupName =
    product.group?.name ||
    (product.group && groupById ? groupById[String(product.group)] : null) ||
    "—";

  return (
    <div className="product-row">
      {/* Фото */}
      <div className="cell-photo">
        <img className="product-photo" src={photoUrl} alt={product.name || "Фото"} />
      </div>

      {/* Название + Группа */}
      <div className="cell-name">
        <Link to={`/admin/products/${product._id}/edit`} className="product-link two-lines">
          {product.name || "—"}
        </Link>
        <div className="product-group">{groupName}</div>
      </div>

      {/* Дата */}
      <div className="cell-date product-date">
        {product.updatedAt
          ? new Date(product.updatedAt).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </div>

      {/* Код */}
      <div className="cell-sku product-sku">{product.sku || "—"}</div>

      {/* Наличие + Опубликован/Скрытый */}
      <div className="cell-state">
        <span
          className={
            "avail " +
            (availability === "published" ? "published" : availability === "order" ? "order" : "out")
          }
        >
          {availabilityLabel}
        </span>
        <span className={"pub " + (isPublished ? "on" : "off")}>
          {isPublished ? "Опубликован" : "Скрытый"}
        </span>
      </div>

      {/* Цена */}
      <div className="cell-price">
        <span className="product-price">{Number(product.price || 0).toLocaleString("uk-UA")} ₴</span>
      </div>

      {/* Заказы */}
      <div className="cell-orders">
        <span className="orders-badge">{ordersCount}</span>
      </div>

      {/* Действия */}
      <div className="cell-actions">
        <div className="actions" ref={ref}>
          <button className="actions-toggle" onClick={() => setOpen((v) => !v)}>
            Действия <span style={{ fontSize: 13 }}>▼</span>
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

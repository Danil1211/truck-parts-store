// frontend/src/admin/AdminProductsPage.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "./utils/api.js";

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

  return (
    <div className="products-page">
      <AdminSubMenu type="products" activeKey={selected} onSelect={setSelected} />

      <div className="products-content">
        {selected === "list" && (
          <>
            <div className="products-toolbar">
              <div className="products-title">
                Позиции <span className="products-count">({filtered.length})</span>
              </div>

              <div className="filters" ref={filterRef}>
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
                placeholder="Поиск по названию или артикулу"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="products-search"
              />

              <button
                className="btn-primary add-btn"
                onClick={() => navigate("/admin/products/create")}
              >
                + Добавить позицию
              </button>
            </div>

            {loading ? (
              <div className="products-empty muted">Загрузка...</div>
            ) : (
              <ProductList products={filtered} onEdit={handleEdit} onDelete={handleDelete} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductList({ products, onEdit, onDelete }) {
  if (!products.length) {
    return <div className="products-empty">Нет позиций по выбранным параметрам.</div>;
  }
  return (
    <div>
      <div className="products-grid-header">
        <div>Фото</div>
        <div>Название</div>
        <div>Дата</div>
        <div>Код</div>
        <div>Наличие</div>
        <div>Цена</div>
      </div>

      {products.map((p) => (
        <ProductRow key={p._id} product={p} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete }) {
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
      : "https://dummyimage.com/160x160/eeeeee/222.png&text=Нет+фото";

  return (
    <div className="product-row">
      <div>
        <img className="product-photo" src={photoUrl} alt={product.name} />
      </div>

      <div>
        <Link to={`/admin/products/${product._id}/edit`} className="product-link">
          {product.name}
        </Link>
      </div>

      <div className="product-date">
        {product.updatedAt
          ? new Date(product.updatedAt).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : ""}
      </div>

      <div className="product-sku">{product.sku}</div>

      <div>
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
      </div>

      <div className="product-right">
        <span className="product-price">{product.price} ₴</span>

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

// frontend/src/admin/AdminGroupsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import "../assets/AdminGroupsPage.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

/* ── helpers ────────────────────────────────────────────────────────────── */
function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .map((g) => ({ ...g, children: buildTree(groups, g._id) }));
}

/* ── icons ──────────────────────────────────────────────────────────────── */
const IconChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className={`g-chevron ${open ? "open" : ""}`} aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconBox = () => (
  <svg className="g-fallback" viewBox="0 0 36 36" aria-hidden="true">
    <rect width="36" height="36" rx="7" />
    <path d="M9 13h18v12H9z" />
    <path d="M9 13l9 5 9-5" />
  </svg>
);
const IconEdit = () => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const IconTrash = () => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

/* ── tree rows ──────────────────────────────────────────────────────────── */
function renderGroupRows(
  items, expanded, toggleExpand, selectedGroup, setSelectedGroup, onEdit, onDelete, level = 0
) {
  return items.map((group) => {
    const hasChildren = !!(group.children && group.children.length);
    const isExpanded = expanded.includes(group._id);
    const isSelected = selectedGroup === group._id;
    const isParentGroup = group.name === "Родительская группа" && !group.parentId;

    return (
      <React.Fragment key={group._id}>
        <div
          className={`group-row ${isSelected ? "selected" : ""}`}
          style={{ marginLeft: level * 22 }}
          onClick={() => { if (hasChildren) toggleExpand(group._id); setSelectedGroup(group._id); }}
        >
          <div className="group-left">
            {group.img ? (
              <img
                src={group.img.startsWith("http") ? group.img : `${BASE_URL}${group.img}`}
                alt={group.name}
                className="g-thumb"
              />
            ) : (<IconBox />)}

            {hasChildren ? (
              <button
                className="chev-btn"
                title={isExpanded ? "Свернуть" : "Развернуть"}
                onClick={(e) => { e.stopPropagation(); toggleExpand(group._id); }}
              >
                <IconChevron open={isExpanded} />
              </button>
            ) : <span className="chev-spacer" aria-hidden="true" />}

            <span className="group-name">{group.name}</span>
          </div>

          {!isParentGroup && (
            <div className="group-actions">
              <button className="icon-btn" title="Редактировать" onClick={(e)=>{e.stopPropagation(); onEdit(group);}}>
                <IconEdit />
              </button>
              <button className="icon-btn danger" title="Удалить" onClick={(e)=>{e.stopPropagation(); onDelete(group);}}>
                <IconTrash />
              </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded &&
          renderGroupRows(group.children, expanded, toggleExpand, selectedGroup, setSelectedGroup, onEdit, onDelete, level + 1)}
      </React.Fragment>
    );
  });
}

/* ── page ───────────────────────────────────────────────────────────────── */
export default function AdminGroupsPage() {
  const navigate = useNavigate();
  const rightPanelRef = useRef();

  // left
  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // right products
  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const [filterStock, setFilterStock] = useState("");          // in_stock | preorder | out
  const [filterVisibility, setFilterVisibility] = useState(""); // published | hidden | draft
  const [searchProducts, setSearchProducts] = useState("");

  // delete modal
  const [deleteModal, setDeleteModal] = useState(null);

  /* load groups */
  useEffect(() => { fetchGroups(); }, []);
  async function fetchGroups() {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/groups`);
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
    setLoading(false);
  }

  /* load products when selection/filters change */
  useEffect(() => {
    if (!selectedGroup) return;
    fetchProducts(selectedGroup);
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = 0;
  }, [selectedGroup, page, limit, filterStock, filterVisibility, searchProducts]);

  async function fetchProducts(groupId) {
    setProdLoading(true);
    try {
      const { data } = await api.get(`/api/products`, {
        params: {
          group: groupId,
          page,
          limit,
          stockState: filterStock || undefined,
          availability: filterVisibility || undefined,
          search: searchProducts || undefined,
          sort: "desc",
        },
      });
      const items = Array.isArray(data) ? data : (data.items || data.results || []);
      const total = (data && (data.total || data.count || data.totalCount)) || null;
      setProducts(items || []);
      setHasMore(total ? page * limit < total : (items || []).length === limit);
    } catch {
      setProducts([]);
      setHasMore(false);
    }
    setProdLoading(false);
  }

  /* tree helpers */
  const toggleExpand = (id) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredTree = search.trim()
    ? buildTree(groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase())))
    : buildTree(groups);

  /* delete */
  async function handleDeleteGroupConfirm() {
    if (!deleteModal) return;
    try {
      await api.delete(`/api/groups/${deleteModal._id}`);
      setDeleteModal(null);
      setSelectedGroup(null);
      fetchGroups();
    } catch (e) {
      alert("Не удалось удалить: " + (e.response?.data?.error || e.message));
    }
  }

  /* ui helpers */
  const displayGroupsCount = groups.length;

  return (
    <div className="groups-page admin-content with-submenu">
      <AdminSubMenu type="products" activeKey="groups" />

      {/* ===== page-topbar ===== */}
      <div className="groups-topbar">
        <div className="groups-h1">Группы <span className="count">({displayGroupsCount})</span></div>

        <input
          className="groups-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по группам"
        />

        <div className="flex-spacer" />
        <button
          onClick={() => navigate("/admin/groups/create")}
          className="btn-primary add-btn"
        >
          <span className="plus-icon">+</span> Добавить
        </button>
      </div>

      {/* ===== body under topbar ===== */}
      <div className="groups-body">
        <div className="groups-card">
          {/* left */}
          <div className="col-left">
            {loading && <div className="loading muted">Загрузка…</div>}
            <div className="tree">
              {renderGroupRows(
                filteredTree,
                expanded,
                toggleExpand,
                selectedGroup,
                (id) => { setSelectedGroup(id); setPage(1); },
                (g) => navigate(`/admin/groups/edit/${g._id}`),
                setDeleteModal
              )}
              {filteredTree.length === 0 && !loading && <div className="empty muted">Нет групп</div>}
            </div>
          </div>

          {/* right */}
          <div className="col-right" ref={rightPanelRef}>
            {selectedGroup ? (
              <>
                <div className="right-title">Товары группы</div>

                {/* filters */}
                <div className="product-filters">
                  <input
                    type="text"
                    placeholder="Поиск товара…"
                    value={searchProducts}
                    onChange={(e) => { setSearchProducts(e.target.value); setPage(1); }}
                  />
                  <select value={filterStock} onChange={(e)=>{ setFilterStock(e.target.value); setPage(1); }}>
                    <option value="">Все по наличию</option>
                    <option value="in_stock">В наличии</option>
                    <option value="preorder">Под заказ</option>
                    <option value="out">Нет в наличии</option>
                  </select>
                  <select value={filterVisibility} onChange={(e)=>{ setFilterVisibility(e.target.value); setPage(1); }}>
                    <option value="">Все по отображению</option>
                    <option value="published">Опубликовано</option>
                    <option value="hidden">Скрыто</option>
                    <option value="draft">Черновик</option>
                  </select>
                  <div className="filters-spacer" />
                  <select className="page-size" value={limit} onChange={(e)=>{ setLimit(Number(e.target.value)); setPage(1); }}>
                    <option value={10}>10 на странице</option>
                    <option value={20}>20 на странице</option>
                    <option value={50}>50 на странице</option>
                    <option value={100}>100 на странице</option>
                  </select>
                </div>

                {prodLoading && <div className="loading muted">Загрузка товаров…</div>}
                {!prodLoading && products.length === 0 && <div className="empty muted">Нет товаров</div>}

                {/* list */}
                {products.map((p) => (
                  <div key={p._id} className="prod-row">
                    <img
                      className="pr-thumb"
                      alt={p.name}
                      src={
                        p.images?.[0]
                          ? (p.images[0].startsWith("http") ? p.images[0] : `${BASE_URL}${p.images[0]}`)
                          : "https://dummyimage.com/64x64/eff2f6/b4bfcc.png&text=IMG"
                      }
                    />

                    <div className="pr-info">
                      <button
                        type="button"
                        className="pr-name link"
                        title="Редактировать товар"
                        onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                      >
                        {p.name}
                      </button>
                      <div className="pr-sku">{p.sku || p._id}</div>
                    </div>

                    <div className="pr-availability">
                      <span className={`pill ${
                        p.stockState === "in_stock" ? "good"
                        : p.stockState === "preorder" ? "warn"
                        : "bad"
                      }`}>
                        {p.stockState === "in_stock" ? "В наличии" :
                         p.stockState === "preorder" ? "Под заказ" : "Нет в наличии"}
                      </span>
                    </div>

                    <button
                      className="pr-edit"
                      title="Редактировать"
                      onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                           stroke="#2291ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* pagination */}
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Назад
                  </button>
                  <span className="page-info">Страница {page}</span>
                  <button
                    className="page-btn"
                    disabled={!hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Вперёд
                  </button>
                </div>
              </>
            ) : (
              <div className="empty muted center big">Выберите группу или подгруппу для просмотра товаров</div>
            )}
          </div>
        </div>
      </div>

      {/* delete modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-title danger">Удалить группу?</div>
            <div className="modal-text">
              Группа <b className="highlight">{deleteModal.name}</b> будет удалена.<br/>
              Товары останутся в системе без группы.
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteModal(null)}>Отмена</button>
              <button className="btn-primary danger" onClick={handleDeleteGroupConfirm}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import "../assets/AdminGroupsPage.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

/* helpers */
function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .map((g) => ({ ...g, children: buildTree(groups, g._id) }));
}
const isRoot = (g) => g?.name === "Родительская группа" && !g?.parentId;
const currencySign = (c) => (c === "UAH" ? "₴" : c === "USD" ? "$" : c === "EUR" ? "€" : c || "");

/* icons */
const IconChevron = ({ open }) => (
  <svg className={`g-chevron${open ? " open" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
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
  <svg className="icon edit" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const IconTrash = () => (
  <svg className="icon trash" viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

/* tree rows */
function Rows({
  items,
  expanded,
  toggleExpand,
  selectedGroup,
  setSelectedGroup,
  onEdit,
  onDelete,
  level = 0,
}) {
  return (items || []).map((g) => {
    const hasChildren = !!(g.children && g.children.length);
    const isExpanded = expanded.includes(g._id);
    const isSelected = selectedGroup === g._id;

    return (
      <React.Fragment key={g._id}>
        <div
          className={`group-row${isSelected ? " selected" : ""}`}
          style={{ marginLeft: level * 22 }}
          onClick={() => {
            if (hasChildren) toggleExpand(g._id);
            setSelectedGroup(g._id);
          }}
        >
          <div className="group-left">
            {g.img ? (
              <img
                className="g-thumb"
                src={g.img.startsWith("http") ? g.img : `${BASE_URL}${g.img}`}
                alt={g.name}
                loading="lazy"
              />
            ) : (
              <IconBox />
            )}

            {hasChildren ? (
              <button
                type="button"
                className="chev-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(g._id);
                }}
                aria-label={isExpanded ? "Свернуть" : "Развернуть"}
              >
                <IconChevron open={isExpanded} />
              </button>
            ) : (
              <span className="chev-spacer" aria-hidden="true" />
            )}

            <span className="group-name">{g.name}</span>
          </div>

          {!isRoot(g) && (
            <div className="group-actions">
              <button type="button" className="icon-btn" title="Редактировать" onClick={(e) => { e.stopPropagation(); onEdit(g); }}>
                <IconEdit />
              </button>
              <button type="button" className="icon-btn danger" title="Удалить" onClick={(e) => { e.stopPropagation(); onDelete(g); }}>
                <IconTrash />
              </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <Rows
            items={g.children}
            expanded={expanded}
            toggleExpand={toggleExpand}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            onEdit={onEdit}
            onDelete={onDelete}
            level={level + 1}
          />
        )}
      </React.Fragment>
    );
  });
}

export default function AdminGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(null);
  const rightRef = useRef();

  useEffect(() => { fetchGroups(); }, []);
  useEffect(() => {
    if (selectedGroup) fetchProducts(selectedGroup);
    if (rightRef.current) rightRef.current.scrollTop = 0;
  }, [selectedGroup]);

  async function fetchGroups() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/groups");
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
    setLoading(false);
  }

  async function fetchProducts(groupId) {
    try {
      const { data } = await api.get("/api/products", { params: { group: groupId } });
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }

  const toggleExpand = (id) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredTree = search.trim()
    ? buildTree(groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase())))
    : buildTree(groups);

  return (
    <div className="admin-content with-submenu groups-page">
      <AdminSubMenu type="products" activeKey="groups" />

      {/* ===== PAGE TOPBAR ===== */}
      <div className="groups-topbar">
        <h1 className="groups-h1">
          Группы <span className="count">({groups.length})</span>
        </h1>
        <input
          className="groups-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по группам"
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate("/admin/groups/create")}
        >
          + Добавить
        </button>
      </div>

      {/* ===== UNIFIED CARD: left tree + right products ===== */}
      <div className="groups-card">
        <div className="col-left">
          <div className="tree">
            {loading && <div className="muted center">Загрузка…</div>}
            {!loading && filteredTree.length > 0 && (
              <Rows
                items={filteredTree}
                expanded={expanded}
                toggleExpand={toggleExpand}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                onEdit={(g) => navigate(`/admin/groups/edit/${g._id}`)}
                onDelete={setDeleteModal}
              />
            )}
            {!loading && filteredTree.length === 0 && (
              <div className="muted center empty">Нет групп</div>
            )}
          </div>
        </div>

        <div ref={rightRef} className="col-right">
          {selectedGroup ? (
            <>
              <div className="right-title">Товары группы</div>
              {products.length === 0 && <div className="muted">Нет товаров</div>}
              {products.map((p) => {
                const cover = p?.images?.[0]
                  ? p.images[0].startsWith("http")
                    ? p.images[0]
                    : `${BASE_URL}${p.images[0]}`
                  : "https://dummyimage.com/60x60/eeeeee/bbb.png&text=IMG";
                const price = p?.retailPrice ?? p?.price ?? 0;
                const cur = currencySign(p?.retailCurrency || "UAH");
                return (
                  <div key={p._id} className="prod-row">
                    <img className="pr-thumb" src={cover} alt="" loading="lazy" />
                    <div className="pr-info">
                      <div className="pr-name" title={p.name}>{p.name}</div>
                      <div className="pr-sku">{p.sku || p._id}</div>
                    </div>
                    <div className="pr-price">{price ? `${price} ${cur}` : "—"}</div>
                    <button
                      type="button"
                      className="pr-edit"
                      onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                      title="Редактировать товар"
                    >
                      <IconEdit />
                    </button>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="muted center big">Выберите группу или подгруппу</div>
          )}
        </div>
      </div>

      {/* ===== DELETE MODAL ===== */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title danger">Удалить группу?</div>
            <p className="modal-text">
              Группа <b className="highlight">{deleteModal.name}</b> будет удалена.<br />
              Дочерние группы поднимутся на верхний уровень, товары отвяжутся.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteModal(null)}>Отмена</button>
              <button
                className="btn-primary danger"
                onClick={async () => {
                  try {
                    await api.delete(`/api/groups/${deleteModal._id}`);
                    setDeleteModal(null);
                    setSelectedGroup(null);
                    fetchGroups();
                  } catch (e) {
                    alert("Ошибка удаления: " + (e?.response?.data?.error || e.message));
                  }
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

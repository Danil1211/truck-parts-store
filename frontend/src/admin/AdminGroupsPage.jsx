import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import "../assets/AdminGroupsPage.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");
const SUBMENU_WIDTH = 300;
const SUBMENU_GAP = 20;

// дерево
function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .map((g) => ({ ...g, children: buildTree(groups, g._id) }));
}

// ===== SVG icons =====
const IconChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .12s" }}
       aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconBox = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
    <rect width="36" height="36" rx="7" fill="#e4e9f3" />
    <path d="M9 13h18v12H9z" fill="none" stroke="#b8c2d3" strokeWidth="1.6" />
    <path d="M9 13l9 5 9-5" fill="none" stroke="#b8c2d3" strokeWidth="1.6" />
  </svg>
);

const IconEdit = ({ color = "#117fff" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconTrash = ({ color = "#e33c3c" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const IconEditSmall = ({ color = "#2291ff" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

// ===== дерево строк =====
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
          <div className="group-row-left">
            {group.img ? (
              <img
                src={group.img.startsWith("http") ? group.img : `${BASE_URL}${group.img}`}
                alt={group.name}
                className="group-thumb"
              />
            ) : (<IconBox />)}

            {hasChildren && (
              <span className="chevron" onClick={(e) => { e.stopPropagation(); toggleExpand(group._id); }}>
                <IconChevron open={isExpanded} />
              </span>
            )}

            <span className="group-name">{group.name}</span>
          </div>

          {!isParentGroup && (
            <div className="group-actions">
              <button onClick={(e) => { e.stopPropagation(); onEdit(group); }}><IconEdit /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(group); }}><IconTrash /></button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded &&
          renderGroupRows(group.children, expanded, toggleExpand, selectedGroup, setSelectedGroup, onEdit, onDelete, level + 1)}
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

  const rightPanelRef = useRef();

  useEffect(() => { fetchGroups(); }, []);
  useEffect(() => {
    if (selectedGroup) fetchProducts(selectedGroup);
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = 0;
  }, [selectedGroup]);

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

  async function fetchProducts(groupId) {
    try {
      const { data } = await api.get(`/api/products`, { params: { group: groupId } });
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }

  const toggleExpand = (id) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredTree = search.trim()
    ? buildTree(groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase())))
    : buildTree(groups);

  return (
    <div className="groups-page-wrap">
      <AdminSubMenu />

      <div className="groups-content" style={{ marginLeft: SUBMENU_WIDTH + SUBMENU_GAP }}>
        {/* ===== Левая панель ===== */}
        <div className="groups-left">
          {/* Заголовок с количеством */}
          <div className="groups-header">
            <h2>Группы <span>({groups.length})</span></h2>
          </div>

          <div className="groups-searchbar">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по группам"
            />
            <button onClick={() => navigate("/admin/groups/create")} className="btn-primary">
              <span className="plus-icon">+</span> Добавить
            </button>
          </div>

          <div className="groups-list">
            {loading && <div className="loading">Загрузка…</div>}
            {renderGroupRows(
              filteredTree,
              expanded,
              toggleExpand,
              selectedGroup,
              setSelectedGroup,
              (g) => navigate(`/admin/groups/edit/${g._id}`),
              setDeleteModal
            )}
            {filteredTree.length === 0 && !loading && (
              <div className="empty">Нет групп</div>
            )}
          </div>
        </div>

        {/* ===== Правая панель ===== */}
        <div className="groups-right" ref={rightPanelRef}>
          {selectedGroup ? (
            <>
              <div className="right-title">Товары группы</div>
              {products.length === 0 && <div className="empty">Нет товаров</div>}
              {products.map((p) => (
                <div key={p._id} className="product-row">
                  <img
                    src={p.images?.[0]
                      ? (p.images[0].startsWith("http") ? p.images[0] : `${BASE_URL}${p.images[0]}`)
                      : "https://dummyimage.com/60x60/eeeeee/bbb.png&text=IMG"}
                    alt={p.name}
                    className="product-thumb"
                  />
                  <div className="product-info">
                    <div className="product-name">{p.name}</div>
                    <div className="product-sku">{p.sku || p._id}</div>
                  </div>
                  <div className="product-price">{p.price} ₴</div>
                  <button
                    onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                    className="edit-btn"
                  >
                    <IconEditSmall />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div className="empty large">Выберите группу для просмотра товаров</div>
          )}
        </div>
      </div>
    </div>
  );
}

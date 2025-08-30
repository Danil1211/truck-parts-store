// frontend/src/admin/AdminGroupsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");
const SIDEBAR_WIDTH = 260; // ширина фиксированного AdminSubMenu, чтобы контент не заходил под меню

// --- helpers ---
function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .map((g) => ({ ...g, children: buildTree(groups, g._id) }));
}

/* === Иконки (SVG) === */
const IconChevron = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .12s", cursor: "pointer" }}
    aria-hidden="true"
  >
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconTrash = ({ color = "#e33c3c" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const IconEditSmall = ({ color = "#2291ff" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

/* === Рендер строки группы === */
function renderGroupRows(
  items,
  expanded,
  toggleExpand,
  selectedGroup,
  setSelectedGroup,
  onEdit,
  onDelete,
  level = 0
) {
  return items.map((group) => {
    const hasChildren = !!(group.children && group.children.length);
    const isExpanded = expanded.includes(group._id);
    const isSelected = selectedGroup === group._id;
    const isParentGroup = group.name === "Родительская группа" && !group.parentId;

    return (
      <React.Fragment key={group._id}>
        <div
          onClick={() => {
            if (hasChildren) toggleExpand(group._id);
            setSelectedGroup(group._id);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 56,
            padding: "10px 0",
            borderRadius: 12,
            marginBottom: 10,
            background: isSelected ? "#eaf4ff" : "#f7fafd",
            fontSize: 15,
            color: isSelected ? "#157ce8" : "#232a3b",
            gap: 10,
            cursor: "pointer",
            border: "1.5px solid",
            borderColor: isSelected ? "#2291ff44" : "transparent",
            marginLeft: level * 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              {group.img ? (
                <img
                  src={group.img.startsWith("http") ? group.img : `${BASE_URL}${group.img}`}
                  alt={group.name}
                  style={{ width: 36, height: 36, borderRadius: 7, objectFit: "cover", background: "#e9f3fa" }}
                />
              ) : (
                <IconBox />
              )}
            </div>

            {hasChildren && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(group._id);
                }}
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                <IconChevron open={isExpanded} />
              </span>
            )}

            <span style={{ fontWeight: 400, fontSize: 15, color: isSelected ? "#157ce8" : "#232a3b" }}>
              {group.name}
            </span>
          </div>

          {!isParentGroup && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 6 }}>
              <button
                style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer" }}
                title="Редактировать"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(group);
                }}
              >
                <IconEdit />
              </button>
              <button
                style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer" }}
                title="Удалить"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(group);
                }}
              >
                <IconTrash />
              </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded &&
          renderGroupRows(
            group.children,
            expanded,
            toggleExpand,
            selectedGroup,
            setSelectedGroup,
            onEdit,
            onDelete,
            level + 1
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

  function handleDeleteGroupClick(group) {
    setDeleteModal(group);
  }

  async function handleDeleteGroupConfirm() {
    await api.delete(`/api/groups/${deleteModal._id}`);
    setDeleteModal(null);
    fetchGroups();
    setSelectedGroup(null);
  }

  function handleEditGroup(group) {
    navigate(`/admin/groups/edit/${group._id}`);
  }

  const filteredTree = search.trim()
    ? buildTree(groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase())))
    : buildTree(groups);

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
      <AdminSubMenu />

      {/* Сдвигаем рабочую область вправо на ширину сайдбара */}
      <div style={{ display: "flex", flex: 1, minWidth: 0, padding: "28px 16px 28px", paddingLeft: SIDEBAR_WIDTH }}>
        {/* Левая панель — группы */}
        <div
          style={{
            flex: "0 0 430px",
            maxWidth: 460,
            background: "#fff",
            borderRadius: 20,
            marginRight: 18,
            padding: "22px",
            boxShadow: "0 2px 12px #2291ff11",
            minHeight: 640,
            height: "calc(100vh - 100px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по группам"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.3px solid #e4e8ee",
                background: "#f7fafb",
                fontSize: 15,
                outline: "none",
              }}
            />
            <button
              onClick={() => navigate("/admin/groups/create")}
              style={{
                background: "#2291ff",
                color: "#fff",
                borderRadius: 9,
                border: "none",
                padding: "10px 14px",
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              + Добавить
            </button>
          </div>

          <div style={{ color: "#828ca6", fontSize: 14, marginBottom: 8, paddingLeft: 2 }}>
            Название группы
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {loading && <div style={{ textAlign: "center", color: "#888", marginTop: 12 }}>Загрузка…</div>}
            {renderGroupRows(
              filteredTree,
              expanded,
              toggleExpand,
              selectedGroup,
              setSelectedGroup,
              handleEditGroup,
              handleDeleteGroupClick
            )}
            {filteredTree.length === 0 && !loading && (
              <div style={{ color: "#a8a8ad", marginTop: 24, fontSize: 16, textAlign: "center" }}>Нет групп</div>
            )}
          </div>
        </div>

        {/* Правая панель — список товаров в выбранной группе */}
        <div
          ref={rightPanelRef}
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 20,
            padding: "22px 24px",
            boxShadow: "0 2px 12px #2291ff11",
            minHeight: 640,
            height: "calc(100vh - 100px)",
            overflow: "auto",
          }}
        >
          {selectedGroup ? (
            <>
              <div style={{ fontWeight: 600, fontSize: 18, color: "#2291ff", marginBottom: 14 }}>
                Товары группы
              </div>

              {products.length === 0 && (
                <div style={{ color: "#a0adc2", marginTop: 12, fontSize: 16 }}>Нет товаров в этой группе</div>
              )}

              {products.map((product) => (
                <div
                  key={product._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid #f0f3f8",
                    gap: 16,
                  }}
                >
                  <img
                    src={
                      product.images?.[0]
                        ? (product.images[0].startsWith("http") ? product.images[0] : `${BASE_URL}${product.images[0]}`)
                        : "https://dummyimage.com/60x60/eeeeee/bbb.png&text=IMG"
                    }
                    alt={product.name}
                    style={{ width: 52, height: 52, borderRadius: 12, objectFit: "contain" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {product.name}
                    </div>
                    <div style={{ color: "#96a2b3", fontSize: 13 }}>{product.sku || product._id}</div>
                  </div>
                  <div style={{ fontWeight: 500, color: "#2291ff", fontSize: 15, marginLeft: "auto" }}>
                    {product.price} ₴
                  </div>
                  <button
                    onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                    style={{
                      background: "transparent",
                      border: "1px solid #2291ff",
                      borderRadius: 8,
                      padding: "6px 8px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: 8,
                    }}
                    title="Редактировать товар"
                  >
                    <IconEditSmall />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div style={{ color: "#b8b8c3", fontSize: 18, textAlign: "center", marginTop: 120 }}>
              Выберите группу или подгруппу для просмотра товаров
            </div>
          )}
        </div>
      </div>

      {/* Модалка удаления */}
      {deleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 14, padding: 28, minWidth: 320, boxShadow: "0 6px 28px rgba(0,0,0,.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#ff3333", marginBottom: 10 }}>Удалить группу?</div>
            <div style={{ color: "#333", fontSize: 14, marginBottom: 18, textAlign: "center", lineHeight: 1.4 }}>
              Группа <b style={{ color: "#2291ff" }}>{deleteModal.name}</b> будет удалена.<br />
              Товары останутся в системе без группы. Действие необратимо.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ background: "#eaf4ff", color: "#157ce8", border: "none", borderRadius: 8, padding: "9px 22px", cursor: "pointer" }}
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteGroupConfirm}
                style={{ background: "#e33c3c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", cursor: "pointer" }}
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

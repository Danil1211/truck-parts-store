// frontend/src/admin/AdminGroupsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

// --- helpers ---
function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .map((g) => ({
      ...g,
      children: buildTree(groups, g._id),
    }));
}

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
    const hasChildren = group.children && group.children.length > 0;
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
            minHeight: 52,
            padding: "10px 0",
            borderRadius: 12,
            marginBottom: 8,
            background: isSelected ? "#f0f6ff" : "#f9fbfd",
            fontWeight: 400,
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
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    objectFit: "cover",
                    background: "#eef4fa",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#e5ebf2",
                  }}
                >
                  {/* 📦 icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="#9aa6b8"
                    strokeWidth="1.6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" />
                    <path d="M3.3 7l8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </div>
              )}
            </div>
            {hasChildren && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(group._id);
                }}
                style={{
                  fontSize: 13,
                  userSelect: "none",
                  cursor: "pointer",
                  transform: isExpanded ? "rotate(90deg)" : "none",
                  transition: "transform 0.15s",
                }}
              >
                {/* ▶ icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            )}
            <span>{group.name}</span>
          </div>
          {!isParentGroup && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px 6px",
                  cursor: "pointer",
                  color: "#117fff",
                }}
                title="Редактировать"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(group);
                }}
              >
                {/* edit icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px 6px",
                  cursor: "pointer",
                  color: "#e33c3c",
                }}
                title="Удалить"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(group);
                }}
              >
                {/* trash icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {hasChildren &&
          isExpanded &&
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

  useEffect(() => {
    fetchGroups();
  }, []);

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

  const handleDeleteGroupClick = (group) => setDeleteModal(group);
  const handleDeleteGroupConfirm = async () => {
    await api.delete(`/api/groups/${deleteModal._id}`);
    setDeleteModal(null);
    fetchGroups();
    setSelectedGroup(null);
  };
  const handleEditGroup = (group) => navigate(`/admin/groups/edit/${group._id}`);

  const filteredTree = search.trim()
    ? buildTree(groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase())))
    : buildTree(groups);

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 60px)", padding: "28px 0" }}>
      <AdminSubMenu />

      <div style={{ display: "flex", flex: 1, minWidth: 0, marginLeft: 80 }}>
        {/* Левая панель — группы */}
        <div
          style={{
            flex: "0 0 380px",
            maxWidth: 400,
            background: "#fff",
            borderRadius: 16,
            margin: "0 18px 0 0",
            padding: "22px",
            boxShadow: "0 2px 10px #2291ff11",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по группам"
              style={{
                flex: 1,
                padding: "9px 14px",
                borderRadius: 8,
                border: "1.3px solid #e4e8ee",
                background: "#f7fafb",
                fontSize: 14,
              }}
            />
            <button
              onClick={() => navigate("/admin/groups/create")}
              style={{
                background: "#2291ff",
                color: "#fff",
                borderRadius: 8,
                border: "none",
                padding: "9px 14px",
                fontSize: 14,
                cursor: "pointer",
                marginLeft: "10px",
              }}
            >
              + Добавить
            </button>
          </div>

          <div style={{ color: "#828ca6", fontSize: 14, marginBottom: 6 }}>Группы</div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading && <div style={{ textAlign: "center", color: "#888", marginTop: 12 }}>Загрузка...</div>}
            {renderGroupRows(filteredTree, expanded, toggleExpand, selectedGroup, setSelectedGroup, handleEditGroup, handleDeleteGroupClick)}
            {filteredTree.length === 0 && !loading && (
              <div style={{ color: "#a8a8ad", marginTop: 24, fontSize: 15, textAlign: "center" }}>Нет групп</div>
            )}
          </div>
        </div>

        {/* Правая панель */}
        <div
          ref={rightPanelRef}
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 16,
            marginRight: 32,
            padding: "22px",
            boxShadow: "0 2px 10px #2291ff11",
            overflow: "auto",
          }}
        >
          {selectedGroup ? (
            <>
              <div style={{ fontWeight: 600, fontSize: 18, color: "#2291ff", marginBottom: 16 }}>Товары группы</div>
              {products.length === 0 && <div style={{ color: "#a0adc2", marginTop: 20, fontSize: 16 }}>Нет товаров в этой группе</div>}
              {products.map((product) => (
                <div
                  key={product._id}
                  style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f3f8" }}
                >
                  <img
                    src={
                      product.images && product.images[0]
                        ? product.images[0].startsWith("http")
                          ? product.images[0]
                          : `${BASE_URL}${product.images[0]}`
                        : "https://dummyimage.com/52x52/e5eaf0/999&text=📦"
                    }
                    alt={product.name}
                    style={{ width: 46, height: 46, borderRadius: 10, objectFit: "contain", marginRight: 18 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>{product.name}</div>
                    <div style={{ color: "#96a2b3", fontSize: 13 }}>{product.sku || product._id}</div>
                  </div>
                  <div style={{ fontWeight: 500, color: "#2291ff", fontSize: 15, marginRight: 16 }}>
                    {product.price} ₴
                  </div>
                  <button
                    style={{
                      background: "#f5faff",
                      color: "#2291ff",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 15,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                  >
                    Ред.
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div style={{ color: "#b8b8c3", fontSize: 18, textAlign: "center", marginTop: 150 }}>
              Выберите группу или подгруппу для просмотра товаров
            </div>
          )}
        </div>
      </div>

      {/* Модалка удаления */}
      {deleteModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 28, minWidth: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: "#ff3333", marginBottom: 8 }}>Удалить группу?</div>
            <div style={{ color: "#333", fontSize: 14, marginBottom: 18, textAlign: "center" }}>
              Группа <b style={{ color: "#2291ff" }}>{deleteModal.name}</b> будет удалена.<br />
              Все товары останутся в системе без группы.<br />
              Действие необратимо!
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ background: "#eaf4ff", color: "#157ce8", border: "none", borderRadius: 6, padding: "7px 18px", cursor: "pointer" }}
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteGroupConfirm}
                style={{ background: "#e33c3c", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", cursor: "pointer" }}
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

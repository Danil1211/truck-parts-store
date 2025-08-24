// frontend/src/admin/AdminGroupsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "../api";

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

function getAllGroupIds(groups, currentId) {
  let ids = [currentId];
  function findChildren(arr, id) {
    arr.forEach((g) => {
      if (g.parentId === id) {
        ids.push(g._id);
        findChildren(arr, g._id);
      }
    });
  }
  findChildren(groups, currentId);
  return ids;
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
            minHeight: 56,
            padding: "10px 0",
            borderRadius: 12,
            marginBottom: 10,
            background: isSelected ? "#eaf4ff" : "#f7fafd",
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
                    width: 36,
                    height: 36,
                    borderRadius: 7,
                    objectFit: "cover",
                    background: "#e9f3fa",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "#e4e9f3",
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 23,
                    color: "#babac7",
                  }}
                >
                  📦
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
                  marginRight: 5,
                  fontSize: 14,
                  userSelect: "none",
                  cursor: "pointer",
                  transform: isExpanded ? "rotate(90deg)" : "none",
                  transition: "transform 0.12s",
                }}
              >
                ▶
              </span>
            )}
            <span
              style={{
                fontWeight: 400,
                fontSize: 15,
                color: isSelected ? "#157ce8" : "#232a3b",
              }}
            >
              {group.name}
            </span>
          </div>
          {!isParentGroup && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#117fff",
                  borderRadius: 7,
                  fontSize: 17,
                  cursor: "pointer",
                  padding: "3px 8px",
                }}
                title="Редактировать"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(group);
                }}
              >
                ✏️
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#e33c3c",
                  borderRadius: 7,
                  fontSize: 17,
                  cursor: "pointer",
                  padding: "3px 8px",
                }}
                title="Удалить"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(group);
                }}
              >
                🗑️
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
    <div style={{ display: "flex", alignItems: "flex-start", minHeight: "calc(100vh - 60px)", padding: "38px 0" }}>
      <AdminSubMenu />

      <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
        {/* Левая панель — группы */}
        <div
          style={{
            flex: "0 0 430px",
            maxWidth: 460,
            background: "#fff",
            borderRadius: 20,
            margin: "0 18px 0 32px",
            padding: "26px 22px 22px 22px",
            boxShadow: "0 2px 12px #2291ff11",
            minHeight: 640,
            height: "calc(100vh - 80px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по группам"
              style={{
                width: "70%",
                padding: "10px 18px",
                borderRadius: 10,
                border: "1.3px solid #e4e8ee",
                background: "#f7fafb",
                fontSize: 15,
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
                fontSize: 15,
                cursor: "pointer",
                marginLeft: "10px",
              }}
            >
              + Добавить группу
            </button>
          </div>

          <div style={{ color: "#828ca6", fontSize: 15, marginBottom: 7, paddingLeft: 2 }}>Название группы</div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {loading && <div style={{ textAlign: "center", color: "#888", marginTop: 12 }}>Загрузка...</div>}
            {renderGroupRows(filteredTree, expanded, toggleExpand, selectedGroup, setSelectedGroup, handleEditGroup, handleDeleteGroupClick)}
            {filteredTree.length === 0 && !loading && (
              <div style={{ color: "#a8a8ad", marginTop: 24, fontSize: 17, textAlign: "center" }}>Нет групп</div>
            )}
          </div>
        </div>

        {/* Правая панель */}
        <div
          ref={rightPanelRef}
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 20,
            marginRight: 32,
            padding: "26px 28px 22px 28px",
            boxShadow: "0 2px 12px #2291ff11",
            minHeight: 640,
            height: "calc(100vh - 80px)",
            overflow: "auto",
          }}
        >
          {selectedGroup ? (
            <>
              <div style={{ fontWeight: 600, fontSize: 21, color: "#2291ff", marginBottom: 18 }}>Товары группы</div>
              {products.length === 0 && <div style={{ color: "#a0adc2", marginTop: 20, fontSize: 18 }}>Нет товаров в этой группе</div>}
              {products.map((product) => (
                <div
                  key={product._id}
                  style={{ display: "flex", alignItems: "center", padding: "15px 0", borderBottom: "1px solid #f0f3f8" }}
                >
                  <img
                    src={
                      product.images && product.images[0]
                        ? product.images[0].startsWith("http")
                          ? product.images[0]
                          : `${BASE_URL}${product.images[0]}`
                        : "https://cdn-icons-png.flaticon.com/512/3281/3281306.png"
                    }
                    alt={product.name}
                    style={{ width: 52, height: 52, borderRadius: 12, objectFit: "contain", marginRight: 20 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15 }}>{product.name}</div>
                    <div style={{ color: "#96a2b3", fontSize: 14 }}>{product.sku || product._id}</div>
                  </div>
                  <div style={{ fontWeight: 500, color: "#2291ff", fontSize: 16, marginRight: 18 }}>{product.price} ₴</div>
                  <button
                    style={{
                      background: "#f5faff",
                      color: "#ff8833",
                      borderRadius: 9,
                      border: "none",
                      fontSize: 17,
                      padding: "8px 14px",
                      cursor: "pointer",
                      marginLeft: "auto",
                    }}
                    onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                  >
                    ✏️
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div style={{ color: "#b8b8c3", fontSize: 21, textAlign: "center", marginTop: 170 }}>
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
            style={{ background: "#fff", borderRadius: 14, padding: 38, minWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 19, fontWeight: 700, color: "#ff3333", marginBottom: 10 }}>Удалить группу?</div>
            <div style={{ color: "#333", fontSize: 15, marginBottom: 22, textAlign: "center" }}>
              Группа <b style={{ color: "#2291ff" }}>{deleteModal.name}</b> будет удалена.<br />
              Все товары из этой группы останутся в системе, но без группы.<br />
              Действие необратимо!
            </div>
            <div style={{ display: "flex", gap: 22 }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ background: "#eaf4ff", color: "#157ce8", border: "none", borderRadius: 8, padding: "9px 28px", cursor: "pointer" }}
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteGroupConfirm}
                style={{ background: "#e33c3c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 28px", cursor: "pointer" }}
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

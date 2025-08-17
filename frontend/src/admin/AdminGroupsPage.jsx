import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";

const API_URL = import.meta.env.VITE_API_URL || "https://truck-parts-backend.onrender.com";

// --- helpers ---
function buildTree(groups, parentId = null) {
  return groups
    .filter(g => String(g.parentId || "") === String(parentId || ""))
    .map(g => ({
      ...g,
      children: buildTree(groups, g._id)
    }));
}
function getAllGroupIds(groups, currentId) {
  let ids = [currentId];
  function findChildren(arr, id) {
    arr.forEach(g => {
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
  return items.map(group => {
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
            boxShadow: "none",
            marginLeft: level * 22,
            fontFamily: "'Segoe UI', 'Inter', Arial, sans-serif",
            transition: "background .13s, border .12s, color .12s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              {group.img
                ? (
                  <img
                    src={
                      group.img.startsWith("http")
                        ? group.img
                        : `${API_URL}${group.img}`
                    }
                    alt={group.name}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 7,
                      objectFit: "cover",
                      background: "#e9f3fa"
                    }}
                  />
                ) : (
                  <div style={{
                    width: 36, height: 36, background: "#e4e9f3", borderRadius: 7,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 23, color: "#babac7"
                  }}>📦</div>
                )
              }
            </div>
            {hasChildren && (
              <span
                onClick={e => { e.stopPropagation(); toggleExpand(group._id); }}
                style={{
                  marginRight: 5,
                  fontSize: 14,
                  userSelect: "none",
                  cursor: "pointer",
                  transition: "transform 0.12s",
                  transform: isExpanded ? "rotate(90deg)" : "none"
                }}
              >
                ▶
              </span>
            )}
            <span style={{
              fontWeight: 400,
              fontSize: 15,
              color: isSelected ? "#157ce8" : "#232a3b",
              fontFamily: "'Segoe UI', 'Inter', Arial, sans-serif"
            }}>
              {group.name}
            </span>
          </div>
          {!isParentGroup && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button
                style={{
                  background: "none", border: "none", color: "#117fff",
                  borderRadius: 7, fontSize: 17, cursor: "pointer", padding: "3px 8px"
                }}
                title="Редактировать"
                onClick={e => { e.stopPropagation(); onEdit(group); }}
              >✏️</button>
              <button
                style={{
                  background: "none", border: "none", color: "#e33c3c",
                  borderRadius: 7, fontSize: 17, cursor: "pointer", padding: "3px 8px"
                }}
                title="Удалить"
                onClick={e => { e.stopPropagation(); onDelete(group); }}
              >🗑️</button>
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
  const location = useLocation();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(null);

  // === FIX: ref for right panel scroll ===
  const rightPanelRef = useRef();

  useEffect(() => {
    fetchGroups();
    fetchProducts();
  }, []);

  // Сброс скролла справа при смене группы
  useEffect(() => {
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTop = 0;
    }
  }, [selectedGroup]);

  function fetchGroups() {
    setLoading(true);
    fetch(`${API_URL}/api/groups`)
      .then(res => res.json())
      .then(data => {
        setGroups(data);
        setLoading(false);
      })
      .catch(() => {
        setGroups([]);
        setLoading(false);
      });
  }
  function fetchProducts() {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }

  // Поиск по всем группам
  let filteredTree = [];
  if (search.trim().length) {
    const q = search.trim().toLowerCase();
    filteredTree = buildTree(groups.filter(g => g.name.toLowerCase().includes(q)));
  } else {
    filteredTree = buildTree(groups);
  }

  const allGroupsFlat = groups;

  // Отфильтрованные товары выбранной группы
  let filteredProducts = [];
  if (selectedGroup) {
    const groupIds = getAllGroupIds(allGroupsFlat, selectedGroup);
    filteredProducts = products.filter(p =>
      p.group && groupIds.includes(
        typeof p.group === "object" && p.group._id ? p.group._id : String(p.group)
      )
    );
  }

  const toggleExpand = id => {
    setExpanded(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAddGroupClick = () => {
    navigate("/admin/groups/create");
  };

  function handleDeleteGroupClick(group) {
    setDeleteModal(group);
  }
  async function handleDeleteGroupConfirm() {
    await fetch(`${API_URL}/api/groups/${deleteModal._id}`, { method: "DELETE" });
    setDeleteModal(null);
    fetchGroups();
    setSelectedGroup(null);
  }
  function handleEditGroup(group) {
    navigate(`/admin/groups/edit/${group._id}`);
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      minHeight: "calc(100vh - 60px)",
      padding: "38px 0"
    }}>
      {/* Боковое меню */}
      <AdminSubMenu />

      {/* Контейнер для групп/контента */}
      <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
        {/* Левая панель — группы */}
        <div style={{
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
          overflow: "hidden"
        }}>
          {/* Поиск и кнопка */}
          <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по группам"
              style={{
                width: "70%",
                padding: "10px 18px",
                borderRadius: 10,
                border: "1.3px solid #e4e8ee",
                background: "#f7fafb",
                fontSize: 15,
                fontWeight: 400,
              }}
            />
            <button
              onClick={handleAddGroupClick}
              style={{
                background: "#2291ff",
                color: "#fff",
                fontWeight: 400,
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

          <div style={{
            fontWeight: 400,
            color: "#828ca6",
            fontSize: 15,
            marginBottom: 7,
            alignItems: "center",
            lineHeight: "1.25",
            minHeight: 42,
            paddingLeft: 2,
          }}>
            Название группы
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {loading && (
              <div style={{ textAlign: "center", color: "#888", marginTop: 12 }}>
                Загрузка...
              </div>
            )}
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
              <div style={{ color: "#a8a8ad", marginTop: 24, fontSize: 17, textAlign: "center" }}>
                Нет групп
              </div>
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
            overflow: "auto"
          }}
        >
          {selectedGroup ? (
            <>
              <div style={{
                fontWeight: 600,
                fontSize: 21,
                color: "#2291ff",
                marginBottom: 18,
              }}>
                Товары группы
              </div>
              {filteredProducts.length === 0 && (
                <div style={{ color: "#a0adc2", marginTop: 20, fontSize: 18 }}>
                  Нет товаров в этой группе
                </div>
              )}
              {filteredProducts.map(product => (
                <div key={product._id} style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "15px 0",
                  borderBottom: "1px solid #f0f3f8"
                }}>
                  <img
                    src={product.images && product.images[0]
                      ? (product.images[0].startsWith("http")
                        ? product.images[0]
                        : `${API_URL}${product.images[0]}`)
                      : "https://cdn-icons-png.flaticon.com/512/3281/3281306.png"}
                    alt={product.name}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      objectFit: "contain",
                      marginRight: 20,
                      background: "#f6fafd"
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 400,
                      fontSize: 15,
                      marginBottom: 1,
                    }}>
                      {product.name}
                    </div>
                    <div style={{
                      color: "#96a2b3",
                      fontSize: 14,
                      fontWeight: 400,
                    }}>
                      {product.sku || product._id}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 500,
                    color: "#2291ff",
                    fontSize: 16,
                    marginRight: 18,
                  }}>
                    {product.price} ₴
                  </div>
                  <button
                    style={{
                      background: "#f5faff",
                      color: "#ff8833",
                      borderRadius: 9,
                      border: "none",
                      fontWeight: 400,
                      fontSize: 17,
                      padding: "8px 14px",
                      cursor: "pointer",
                      boxShadow: "0 1px 8px #2291ff12",
                      marginLeft: "auto",
                    }}
                    onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                  >✏️</button>
                </div>
              ))}
            </>
          ) : (
            <div style={{
              color: "#b8b8c3",
              fontWeight: 400,
              fontSize: 21,
              textAlign: "center",
              marginTop: 170,
            }}>
              Выберите группу или подгруппу для просмотра товаров
            </div>
          )}
        </div>
      </div>

      {/* Модалка удаления */}
      {deleteModal && (
        <div
          style={{
            position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.12)", zIndex: 10002,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 14, padding: 38, minWidth: 320,
              boxShadow: "0 2px 20px #0002", display: "flex", flexDirection: "column", alignItems: "center"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              fontSize: 19, fontWeight: 700, color: "#ff3333", marginBottom: 10,
            }}>
              Удалить группу?
            </div>
            <div style={{
              color: "#333", fontSize: 15, marginBottom: 22, textAlign: "center",
              fontWeight: 400,
            }}>
              Группа <span style={{ fontWeight: 600, color: "#2291ff" }}>{deleteModal.name}</span> будет удалена.<br />
              Все товары из этой группы останутся в системе, но без группы.<br />
              Действие необратимо!
            </div>
            <div style={{ display: "flex", gap: 22, marginTop: 2 }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{
                  background: "#eaf4ff",
                  color: "#157ce8",
                  fontWeight: 400,
                  fontSize: 15,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 28px",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px #2291ff13"
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteGroupConfirm}
                style={{
                  background: "#e33c3c",
                  color: "#fff",
                  fontWeight: 400,
                  fontSize: 15,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 28px",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px #e33c3c22"
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

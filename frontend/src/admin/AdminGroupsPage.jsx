// frontend/src/admin/AdminGroupsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

/* ======================= SVG иконки ======================= */
const IconChevron = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .12s" }}>
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPencil = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconBox = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="#c9d3e3" strokeWidth="1.6" fill="#eef3f9"/>
    <path d="M8 8h8v8H8z" stroke="#b7c4d8" strokeWidth="1.2" fill="#f7fafc"/>
  </svg>
);

/* ======================= helpers ======================= */
// поддерживаем и плоский список с parentId, и уже-дерево с children
function flattenTree(tree, out = []) {
  for (const n of tree || []) {
    const { children, ...rest } = n;
    out.push(rest);
    if (children?.length) flattenTree(children, out);
  }
  return out;
}

function buildTreeFromFlat(list, parentId = null) {
  const p = String(parentId ?? "");
  return list
    .filter(g => String(g.parentId ?? "") === p)
    .map(g => ({ ...g, children: buildTreeFromFlat(list, g._id) }));
}

function normalizeGroups(data) {
  if (!Array.isArray(data)) return { flat: [], tree: [] };
  const hasChildrenShape = data.some(g => Array.isArray(g.children));
  if (hasChildrenShape) {
    const tree = data;
    const flat = flattenTree(tree);
    return { flat, tree };
  }
  const flat = data;
  const tree = buildTreeFromFlat(flat);
  return { flat, tree };
}

/* рендер строки группы */
function GroupRow({
  node, level, expanded, setExpanded, selectedGroup, setSelectedGroup,
  onEdit, onDelete
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.includes(node._id);
  const isSelected = selectedGroup === node._id;
  const isParent = node.name === "Родительская группа" && !node.parentId;
  const img = node.img || node.image;

  return (
    <>
      <div
        onClick={() => { if (hasChildren) setExpanded(prev => (
            prev.includes(node._id) ? prev.filter(x => x !== node._id) : [...prev, node._id]
          )); setSelectedGroup(node._id); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          minHeight: 56, padding: "10px 12px", borderRadius: 12, marginBottom: 8,
          background: isSelected ? "#eaf4ff" : "#f7fafd",
          color: isSelected ? "#157ce8" : "#232a3b",
          border: "1.5px solid", borderColor: isSelected ? "#2291ff44" : "transparent",
          marginLeft: level * 20, cursor: "pointer"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {hasChildren && (
            <span
              onClick={(e) => { e.stopPropagation(); setExpanded(prev => (
                prev.includes(node._id) ? prev.filter(x => x !== node._id) : [...prev, node._id]
              )); }}
              style={{ color: "#6b7a90", display: "inline-flex" }}
              aria-hidden
            >
              <IconChevron open={isExpanded} />
            </span>
          )}

          <div style={{ width: 36, height: 36, borderRadius: 7, overflow: "hidden", background: "#e9f3fa" }}>
            {img ? (
              <img
                src={img.startsWith("http") ? img : `${BASE_URL}${img}`}
                alt={node.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : <IconBox/>}
          </div>

          <span style={{ fontSize: 15 }}>{node.name}</span>
        </div>

        {!isParent && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              title="Редактировать"
              onClick={(e) => { e.stopPropagation(); onEdit(node); }}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30, borderRadius: 8, background: "#f1f6ff", border: "1px solid #dbe6f6",
                color: "#117fff", cursor: "pointer"
              }}
            >
              <IconPencil/>
            </button>
            <button
              title="Удалить"
              onClick={(e) => { e.stopPropagation(); onDelete(node); }}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30, borderRadius: 8, background: "#fff5f5", border: "1px solid #ffe1e1",
                color: "#e33c3c", cursor: "pointer"
              }}
            >
              <IconTrash/>
            </button>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && node.children.map(ch => (
        <GroupRow
          key={ch._id}
          node={ch}
          level={level + 1}
          expanded={expanded}
          setExpanded={setExpanded}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

/* ======================= страница ======================= */
export default function AdminGroupsPage() {
  const navigate = useNavigate();

  const [groupsFlat, setGroupsFlat] = useState([]);
  const [groupsTree, setGroupsTree] = useState([]);
  const [expanded, setExpanded] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(null);

  const rightPanelRef = useRef();

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => {
    if (selectedGroup) loadProducts(selectedGroup);
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = 0;
  }, [selectedGroup]);

  async function loadGroups() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/groups");
      const { flat, tree } = normalizeGroups(Array.isArray(data) ? data : []);
      setGroupsFlat(flat);
      setGroupsTree(tree);
    } catch {
      setGroupsFlat([]); setGroupsTree([]);
    }
    setLoading(false);
  }

  async function loadProducts(groupId) {
    try {
      const { data } = await api.get("/api/products", { params: { group: groupId } });
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }

  function handleEditGroup(g) { navigate(`/admin/groups/edit/${g._id}`); }
  function handleAskDelete(g) { setDeleteModal(g); }
  async function handleConfirmDelete() {
    try {
      await api.delete(`/api/groups/${deleteModal._id}`);
      setDeleteModal(null);
      await loadGroups();
      setSelectedGroup(null);
    } catch {}
  }

  // Поиск: фильтруем flat и строим дерево из результата
  const filteredTree = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return groupsTree;
    const filteredFlat = groupsFlat.filter(g => String(g.name || "").toLowerCase().includes(q));
    return buildTreeFromFlat(filteredFlat);
  })();

  // Цена как в списке товаров
  const priceView = (p) => {
    const currency = p.retailCurrency || "UAH";
    const sign = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₴";
    const mode = p.priceMode || "retail";
    if (mode === "service") return "Услуга";
    if (mode === "wholesale") {
      const t = Array.isArray(p.wholesaleTiers) && p.wholesaleTiers[0];
      if (!t) return "—";
      const c = t.currency || currency;
      const s = c === "USD" ? "$" : c === "EUR" ? "€" : "₴";
      return `опт от ${t.minQty}шт: ${Number(t.price).toLocaleString("ru-RU")} ${s}`;
    }
    const val = Number(p.retailPrice);
    const base = Number.isFinite(val) && val > 0 ? val.toLocaleString("ru-RU") : "—";
    return `${p.priceFromFlag ? "от " : ""}${base} ${sign}`;
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", minHeight: "calc(100vh - 60px)", padding: "38px 0" }}>
      <AdminSubMenu />

      <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
        {/* Левая панель */}
        <div
          style={{
            flex: "0 0 430px", maxWidth: 460, background: "#fff", borderRadius: 20,
            margin: "0 18px 0 32px", padding: "26px 22px 22px 22px",
            boxShadow: "0 2px 12px #2291ff11", minHeight: 640, height: "calc(100vh - 80px)",
            display: "flex", flexDirection: "column"
          }}
        >
          <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по группам"
              style={{
                flex: 1, padding: "10px 18px", borderRadius: 10, border: "1.3px solid #e4e8ee",
                background: "#f7fafb", fontSize: 15
              }}
            />
            <button
              onClick={() => navigate("/admin/groups/create")}
              style={{
                background: "#2291ff", color: "#fff", borderRadius: 9, border: "none",
                padding: "10px 14px", fontSize: 15, cursor: "pointer"
              }}
            >
              + Добавить группу
            </button>
          </div>

          <div style={{ color: "#828ca6", fontSize: 15, marginBottom: 7, paddingLeft: 2 }}>Название группы</div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {loading && <div style={{ textAlign: "center", color: "#888", marginTop: 12 }}>Загрузка…</div>}

            {filteredTree.length > 0 ? (
              filteredTree.map(root => (
                <GroupRow
                  key={root._id}
                  node={root}
                  level={0}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  onEdit={handleEditGroup}
                  onDelete={handleAskDelete}
                />
              ))
            ) : !loading ? (
              <div style={{ color: "#a8a8ad", marginTop: 24, fontSize: 17, textAlign: "center" }}>Нет групп</div>
            ) : null}
          </div>
        </div>

        {/* Правая панель */}
        <div
          ref={rightPanelRef}
          style={{
            flex: 1, background: "#fff", borderRadius: 20, marginRight: 32,
            padding: "26px 28px 22px 28px", boxShadow: "0 2px 12px #2291ff11",
            minHeight: 640, height: "calc(100vh - 80px)", overflow: "auto"
          }}
        >
          {selectedGroup ? (
            <>
              <div style={{ fontWeight: 600, fontSize: 21, color: "#2291ff", marginBottom: 18 }}>Товары группы</div>

              {products.length === 0 && (
                <div style={{ color: "#a0adc2", marginTop: 20, fontSize: 18 }}>Нет товаров в этой группе</div>
              )}

              {products.map((product) => {
                const img = product.images?.[0];
                const photoUrl = img
                  ? (img.startsWith("http") ? img : `${BASE_URL}${img}`)
                  : null;

                return (
                  <div key={product._id}
                       style={{ display: "flex", alignItems: "center", padding: "15px 0", borderBottom: "1px solid #f0f3f8" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: "#f2f6fb",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  marginRight: 16, overflow: "hidden" }}>
                      {photoUrl ? (
                        <img src={photoUrl} alt={product.name}
                             style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      ) : (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="4" stroke="#c9d3e3" strokeWidth="1.6" fill="#eef3f9"/>
                          <path d="M7 16l3-3 2 2 3-3 2 2" stroke="#b7c4d8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {product.name}
                      </div>
                      <div style={{ color: "#96a2b3", fontSize: 13.5 }}>
                        {product.sku || product._id}
                      </div>
                    </div>

                    <div style={{ fontWeight: 500, color: "#2291ff", fontSize: 16, marginRight: 18 }}>
                      {priceView(product)}
                    </div>

                    <button
                      onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                      title="Редактировать товар"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        background: "#f5faff", color: "#ff8833", borderRadius: 9, border: "1px solid #ffe0cc",
                        padding: "8px 12px", cursor: "pointer"
                      }}
                    >
                      <IconPencil/>
                    </button>
                  </div>
                );
              })}
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
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.12)",
                   display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 14, padding: 28, minWidth: 340, boxShadow: "0 10px 24px rgba(0,0,0,.06)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e33c3c" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/>
              </svg>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#e33c3c" }}>Удалить группу?</div>
            </div>

            <div style={{ color: "#333", fontSize: 14.5, marginBottom: 18, lineHeight: 1.5 }}>
              Группа <b style={{ color: "#2291ff" }}>{deleteModal.name}</b> будет удалена.<br/>
              Все товары из этой группы останутся в системе, но без группы. Действие необратимо.
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ background: "#eaf4ff", color: "#157ce8", border: "none", borderRadius: 8,
                         padding: "9px 16px", cursor: "pointer" }}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{ background: "#e33c3c", color: "#fff", border: "none", borderRadius: 8,
                         padding: "9px 16px", cursor: "pointer" }}
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

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import "../assets/AdminGroupsPage.css";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

/* =============== helpers =============== */
function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .map((g) => ({ ...g, children: buildTree(groups, g._id) }));
}
const isRootGroup = (g) => g?.name === "Родительская группа" && !g?.parentId;

/* =============== icons (SVG) =============== */
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

/* =============== tree rows =============== */
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
  return (items || []).map((group) => {
    const hasChildren = !!(group.children && group.children.length);
    const isExpanded = expanded.includes(group._id);
    const isSelected = selectedGroup === group._id;

    return (
      <React.Fragment key={group._id}>
        <div
          className={`group-row${isSelected ? " active" : ""}`}
          style={{ "--level": level }}
          onClick={() => {
            if (hasChildren) toggleExpand(group._id);
            setSelectedGroup(group._id);
          }}
        >
          <div className="group-left">
            {group.img ? (
              <img
                className="g-thumb"
                src={group.img.startsWith("http") ? group.img : `${BASE_URL}${group.img}`}
                alt={group.name}
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
                  toggleExpand(group._id);
                }}
                aria-label={isExpanded ? "Свернуть" : "Развернуть"}
              >
                <IconChevron open={isExpanded} />
              </button>
            ) : (
              <span className="chev-spacer" aria-hidden="true" />
            )}

            <span className="group-name">{group.name}</span>
          </div>

          {!isRootGroup(group) && (
            <div className="group-actions">
              <button
                type="button"
                className="icon-btn"
                title="Редактировать"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(group);
                }}
              >
                <IconEdit />
              </button>
              <button
                type="button"
                className="icon-btn danger"
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

        {hasChildren && isExpanded && (
          <Rows
            items={group.children}
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

/* =============== page =============== */
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

  const handleDeleteGroupClick = (group) => setDeleteModal(group);

  async function handleDeleteGroupConfirm() {
    try {
      await api.delete(`/api/groups/${deleteModal._id}`);
      setDeleteModal(null);
      fetchGroups();
      setSelectedGroup(null);
    } catch (e) {
      alert("Ошибка удаления: " + (e?.response?.data?.error || e.message));
    }
  }

  const handleEditGroup = (group) => navigate(`/admin/groups/edit/${group._id}`);

  const filteredTree = search.trim()
    ? buildTree(groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase())))
    : buildTree(groups);

  const currencySign = (c) =>
    c === "UAH" ? "₴" : c === "USD" ? "$" : c === "EUR" ? "€" : c || "";

  return (
    <div className="admin-content with-submenu groups-page">
      <AdminSubMenu type="products" activeKey="groups" />

      {/* header */}
      <div className="groups-header">
        <div className="groups-header-left">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="groups-search"
            placeholder="Поиск по группам"
          />
        </div>
        <div className="groups-header-right">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/admin/groups/create")}
          >
            + Добавить группу
          </button>
        </div>
      </div>

      {/* content */}
      <div className="groups-content-wrap">
        {/* left */}
        <div className="groups-left">
          <div className="tree-caption">Название группы</div>

          <div className="groups-tree">
            {loading && <div className="muted center">Загрузка…</div>}

            {!loading && filteredTree.length > 0 && (
              <Rows
                items={filteredTree}
                expanded={expanded}
                toggleExpand={toggleExpand}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                onEdit={handleEditGroup}
                onDelete={handleDeleteGroupClick}
              />
            )}

            {!loading && filteredTree.length === 0 && (
              <div className="muted center empty">Нет групп</div>
            )}
          </div>
        </div>

        {/* right */}
        <div ref={rightPanelRef} className="groups-right">
          {selectedGroup ? (
            <>
              <div className="groups-right-title">Товары группы</div>

              {products.length === 0 && (
                <div className="muted">Нет товаров в этой группе</div>
              )}

              {products.map((p) => {
                const cover = p?.images?.[0]
                  ? p.images[0].startsWith("http")
                    ? p.images[0]
                    : `${BASE_URL}${p.images[0]}`
                  : "https://dummyimage.com/60x60/eeeeee/bbb.png&text=IMG";

                const price = p?.retailPrice ?? p?.price ?? 0;
                const cur = currencySign(p?.retailCurrency || "UAH");

                return (
                  <div key={p._id} className="group-product-row">
                    <img className="gp-thumb" src={cover} alt="" loading="lazy" />
                    <div className="gp-info">
                      <div className="gp-name" title={p.name}>{p.name}</div>
                      <div className="gp-sku">{p.sku || p._id}</div>
                    </div>
                    <div className="gp-price">
                      {price ? `${price} ${cur}` : "—"}
                    </div>
                    <button
                      type="button"
                      className="gp-edit"
                      title="Редактировать товар"
                      onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                    >
                      <IconEdit />
                    </button>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="groups-right-empty">
              Выберите группу или подгруппу для просмотра товаров
            </div>
          )}
        </div>
      </div>

      {/* delete modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title danger">Удалить группу?</div>
            <p className="modal-text">
              Группа <b className="highlight">{deleteModal.name}</b> будет удалена.
              <br /> Товары останутся в системе без группы. Действие необратимо.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteModal(null)}>
                Отмена
              </button>
              <button className="btn-primary danger" onClick={handleDeleteGroupConfirm}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

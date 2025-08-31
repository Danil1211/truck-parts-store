import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminCreateGroupPage.css";

export default function AdminCreateGroupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null);
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/groups")
      .then(({ data }) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return setPreview(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post("/api/groups", {
        name,
        parentId: parentId || null,
        description,
        img: preview || null,
      });
      if (data?._id) navigate("/admin/groups");
    } catch (err) {
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const ROOT_GROUP = groups.find((g) => g.name === "Родительская группа" && !g.parentId);
  const availableParents = groups.filter((g) => g._id !== (ROOT_GROUP && ROOT_GROUP._id));

  return (
    <div className="admin-root">
      {/* SUB MENU */}
      <AdminSubMenu
        title="Группы"
        tabs={[
          { label: "Все группы", to: "/admin/groups" },
          { label: "Добавить", to: "/admin/groups/create", active: true },
        ]}
      />

      <div className="admin-content">
        <form className="cg-card" onSubmit={handleSaveGroup}>
          <div className="cg-left">
            <h1>Добавить группу</h1>

            <div className="cg-block">
              <label>Название группы</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите название группы"
                required
              />
            </div>

            <div className="cg-block">
              <label>Родительская группа</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value={ROOT_GROUP?._id || ""}>
                  Родительская группа (верхний уровень)
                </option>
                {availableParents.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="cg-block">
              <label>Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Введите описание группы"
              />
            </div>
          </div>

          <div className="cg-right">
            <div className="cg-block">
              <label>Изображение</label>
              <div className="cg-upload">
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {preview ? (
                  <img src={preview} alt="Preview" className="cg-preview" />
                ) : (
                  <p>200x200 • JPG, PNG, WEBP • до 10MB</p>
                )}
              </div>
            </div>
            <button type="submit" disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить группу"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

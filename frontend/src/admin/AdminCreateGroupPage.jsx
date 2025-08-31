// frontend/src/admin/AdminCreateGroupPage.jsx
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

  const axiosSafe = async (fn) => {
    try {
      const { data } = await fn();
      return data;
    } catch (err) {
      throw new Error(err?.response?.data?.error || err?.message || "Ошибка запроса");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await axiosSafe(() => api.get("/api/groups"));
        setGroups(Array.isArray(data) ? data : []);
      } catch {
        setGroups([]);
      }
    })();
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
      const payload = {
        name: name.trim(),
        parentId: parentId || null,
        description: description || "",
        img: preview || null,
      };
      const created = await axiosSafe(() => api.post("/api/groups", payload));
      if (created?._id) navigate("/admin/groups");
      else alert("Ошибка сохранения группы");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const ROOT_GROUP = groups.find((g) => g.name === "Родительская группа" && !g.parentId);
  const availableParents = groups.filter((g) => g._id !== (ROOT_GROUP && ROOT_GROUP._id));

  return (
    <div className="admin-root">
      <AdminSubMenu title="Добавить группу" backLink="/admin/groups" />

      <div className="admin-content">
        <form className="cg-form-card" onSubmit={handleSaveGroup}>
          <div className="cg-form-left">
            <div className="cg-form-block">
              <label>Название группы</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите название группы"
                required
                autoFocus
              />
            </div>

            <div className="cg-form-block">
              <label>
                Родительская группа{" "}
                <span className="cg-hint">(группа верхнего уровня)</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value={ROOT_GROUP?._id || ""}>
                  Родительская группа (верхний уровень)
                </option>
                {availableParents.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cg-form-block">
              <label>Описание группы</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Введите описание"
              />
            </div>
          </div>

          <div className="cg-form-right">
            <div className="cg-form-block">
              <label>Изображение группы</label>
              <div className="cg-upload-box">
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {preview ? (
                  <img src={preview} alt="Preview" className="cg-preview-img" />
                ) : (
                  <div className="cg-upload-hint">
                    Реком. размер 200x200 <br />
                    JPG, PNG, WEBP до 10MB
                  </div>
                )}
              </div>
            </div>

            <div className="cg-form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

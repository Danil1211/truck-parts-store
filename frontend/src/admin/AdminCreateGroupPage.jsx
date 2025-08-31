// frontend/src/admin/AdminCreateGroupPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubMenu from "./AdminSubMenu";
import api from "../utils/api.js";
import "../assets/AdminCreateGroupPage.css";

export default function AdminCreateGroupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null);

  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const axiosSafe = async (fn) => {
    try {
      const { data } = await fn();
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Ошибка запроса";
      throw new Error(msg);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await axiosSafe(() => api.get("/api/groups"));
        setGroups(Array.isArray(data) ? data : []);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
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
    if (!name.trim() || saving) return;
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
      alert(err.message || "Ошибка при сохранении группы");
    } finally {
      setSaving(false);
    }
  };

  const ROOT_GROUP = groups.find((g) => g.name === "Родительская группа" && !g.parentId);
  const availableParents = groups.filter((g) => g._id !== (ROOT_GROUP && ROOT_GROUP._id));

  return (
    <div className="admin-create-group-page has-left-submenu">
      {/* Верхняя панель */}
      <div className="acg-topbar">
        <button
          type="button"
          className="acg-btn acg-btn-ghost"
          onClick={() => navigate("/admin/groups")}
          aria-label="Назад"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M15.5 19.09 9.41 13l6.09-6.09L14.08 5.5 6.59 13l7.49 7.5z" />
          </svg>
          Назад
        </button>

        <h1 className="acg-title">Добавить группу</h1>

        <button
          type="submit"
          form="create-group-form"
          className="acg-btn acg-btn-primary"
          disabled={saving}
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      {/* Контент + правый субменю-слот */}
      <div className="acg-grid">
        {/* Форма */}
        <form id="create-group-form" className="acg-form" onSubmit={handleSaveGroup}>
          <div className="acg-card">
            <div className="acg-field">
              <label className="acg-label">Название группы</label>
              <input
                className="acg-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите название группы"
                required
                autoFocus
              />
            </div>

            <div className="acg-field">
              <label className="acg-label">
                Родительская группа <span className="acg-hint">(группа верхнего уровня)</span>
              </label>
              <select
                className="acg-select"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={loading}
              >
                <option value={ROOT_GROUP?._id || ""}>
                  Родительская группа (группа верхнего уровня)
                </option>
                {availableParents.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="acg-field">
              <label className="acg-label">Описание группы</label>
              <textarea
                className="acg-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Короткое описание группы"
                rows={5}
              />
            </div>
          </div>

          <div className="acg-card">
            <div className="acg-field">
              <label className="acg-label">Изображение группы</label>

              <div className="acg-upload">
                <input
                  className="acg-file"
                  type="file"
                  accept="image/*"
                  id="acg-file-input"
                  onChange={handleImageChange}
                />
                <label htmlFor="acg-file-input" className="acg-file-label">Выбрать файл</label>

                {preview ? (
                  <div className="acg-preview-wrap">
                    <img src={preview} alt="Preview" className="acg-preview" />
                    <button
                      type="button"
                      className="acg-btn acg-btn-ghost acg-btn-clear"
                      onClick={() => setPreview(null)}
                    >
                      Удалить
                    </button>
                  </div>
                ) : (
                  <div className="acg-upload-hint">
                    Рекомендовано: 200×200 px • JPG / PNG / WEBP • до 10 MB
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="acg-actions-bottom">
            <button
              type="button"
              className="acg-btn acg-btn-ghost"
              onClick={() => navigate("/admin/groups")}
            >
              Отмена
            </button>
            <button className="acg-btn acg-btn-primary" disabled={saving}>
              {saving ? "Сохраняем…" : "Сохранить группу"}
            </button>
          </div>
        </form>

        {/* Правое субменю */}
        <aside className="acg-submenu">
          <AdminSubMenu />
        </aside>
      </div>
    </div>
  );
}

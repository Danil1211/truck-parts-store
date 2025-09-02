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
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/groups");
        setGroups(Array.isArray(data) ? data : []);
      } catch {
        setGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    })();
  }, []);

  const handleImageFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Файл слишком большой (макс. 10MB)");
      return;
    }
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
      await api.post("/api/groups", payload);
      navigate("/admin/groups");
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-group groups-page">
      <AdminSubMenu
        title="Управление товарами"
        items={[
          { label: "Товары", to: "/admin/products" },
          { label: "Группы", to: "/admin/groups", active: true },
        ]}
      />

      <div className="cg-topbar">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigate("/admin/groups")}
        >
          ← Назад
        </button>
        <button
          type="submit"
          form="cg-form"
          className="btn-primary"
          disabled={saving || !name.trim()}
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      <div className="cg-content-wrap">
        <form id="cg-form" className="cg-grid" onSubmit={handleSaveGroup}>
          {/* Левая колонка */}
          <div className="cg-left">
            <div className="card">
              <div className="card-title">Основная информация</div>
              <div className="field-col">
                <label>Название группы</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите название группы"
                  required
                />
              </div>

              <div className="field-col">
                <label>Родительская группа</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  disabled={loadingGroups}
                >
                  <option value="">(Верхний уровень)</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-col">
                <label>Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Краткое описание группы (необязательно)"
                />
              </div>
            </div>
          </div>

          {/* Правая колонка */}
          <div className="cg-right">
            <div className="card">
              <div className="card-title">Изображение</div>
              {!preview && (
                <div className="upload-box">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFile(e.target.files?.[0])}
                  />
                  <p>200×200 • JPG, PNG, WEBP • до 10MB</p>
                </div>
              )}
              {preview && (
                <div className="preview-wrap">
                  <img src={preview} alt="Preview" />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setPreview(null)}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

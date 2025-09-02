import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
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

  const handleImageChange = (e) => handleImageFile(e.target.files?.[0]);
  const clearPreview = () => setPreview(null);

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
      const { data } = await api.post("/api/groups", payload);
      if (data?._id) {
        navigate("/admin/groups");
      } else {
        alert("Ошибка сохранения группы");
      }
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || "Ошибка при сохранении");
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

      {/* локальная шапка */}
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
          disabled={saving || !name.trim()}
          className="btn-primary"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      <form id="cg-form" className="cg-form" onSubmit={handleSaveGroup}>
        <div className="layout-grid">
          {/* ===== ЛЕВАЯ КОЛОНКА ===== */}
          <div className="main-col">
            <div className="card">
              <div className="card-title">Название группы</div>
              <div className="field-col">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите название группы"
                  required
                />
                <div className="muted">Например: «Амортизаторы», «Колодки тормозные»</div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Родительская группа</div>
              {loadingGroups && <div className="muted">Загрузка…</div>}
              {!loadingGroups && (
                <div className="field-col">
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="">Верхний уровень</option>
                    {groups.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">Описание</div>
              <div className="field-col">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Краткое описание группы (необязательно)"
                />
              </div>
            </div>
          </div>

          {/* ===== ПРАВАЯ КОЛОНКА ===== */}
          <div className="side-col">
            <div className="card">
              <div className="card-title">Изображение</div>
              {!preview && (
                <div className="upload">
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                  <p className="muted">200×200 • JPG, PNG, WEBP • до 10MB</p>
                </div>
              )}
              {preview && (
                <div className="preview-wrap">
                  <img src={preview} alt="Preview" className="preview" />
                  <button type="button" className="btn-ghost danger" onClick={clearPreview}>
                    Удалить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

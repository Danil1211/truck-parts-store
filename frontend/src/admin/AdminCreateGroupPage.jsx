import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";
import LocalEditor from "../components/LocalEditor";

import "../assets/AdminPanel.css";
/* важно: чтобы получить тот же лейаут и стили, что у страницы товара */
import "../assets/AdminAddProductPage.css";
import "../assets/AdminCreateGroupPage.css";

export default function AdminCreateGroupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/groups");
        setGroups(data || []);
      } catch (err) {
        console.error("Ошибка загрузки групп:", err);
      }
    })();
  }, []);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const applyFile = (f) => {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const clearImage = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { alert("Введите название группы"); return; }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("parentId", parentId);
      if (file) fd.append("image", file);
      await api.post("/api/groups", fd);
      navigate("/admin/groups");
    } catch (err) {
      alert("Ошибка сохранения: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-content with-submenu add-prod add-group groups-page">
      <AdminSubMenu type="groups" activeKey="create" />

      {/* Topbar — как на AddProduct */}
      <div className="addprod-topbar">
        <button className="btn-ghost" onClick={() => navigate("/admin/groups")}>← Назад</button>
        <button type="submit" form="add-group-form" disabled={saving} className="btn-primary">
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>

      <form id="add-group-form" className="addprod-form" onSubmit={handleSubmit}>
        <div className="layout-grid">
          {/* Левая колонка */}
          <div className="main-col">
            <div className="card">
              <div className="card-title">Основная информация</div>

              <div className="field-col">
                <label>Название группы</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите название группы"
                  maxLength={120}
                />
              </div>

              <div className="field-col">
                <label>Родительская группа</label>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">(Верхний уровень)</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="field-col">
                <label>Описание</label>
                <LocalEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Краткое описание группы (необязательно)"
                  minHeight={200}
                />
              </div>
            </div>
          </div>

          {/* Правая колонка */}
          <div className="side-col">
            <div className="card">
              <div className="card-title">Изображение</div>

              <div
                className={`upload-box ${isDragging ? "dragging" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="Загрузить изображение"
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {!preview ? (
                  <div className="upload-placeholder">
                    <div className="upload-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                    <p>Выберите файл или перетащите сюда</p>
                    <small>Рекомендация: 200×200 • JPG/PNG/WEBP • до 10MB</small>
                  </div>
                ) : (
                  <div className="preview-wrap">
                    <div className="preview-frame"><img src={preview} alt="preview" /></div>
                    <div className="preview-actions">
                      <button type="button" className="btn-ghost" onClick={clearImage}>Удалить</button>
                      <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>Заменить</button>
                    </div>
                  </div>
                )}
                <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleFileChange} />
              </div>

              <div className="hint">Изображение используется в списках и карточке группы.</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

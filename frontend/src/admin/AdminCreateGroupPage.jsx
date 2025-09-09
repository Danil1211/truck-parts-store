// frontend/src/admin/AdminCreateGroupPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";
import LocalEditor from "../components/LocalEditor";
import "../assets/AdminPanel.css";
import "../assets/AdminCreateGroupPage.css";

export default function AdminCreateGroupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(null);
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
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const applyFile = (f) => {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onFileInput = (e) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const clearImage = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Введите название группы");

    try {
      setSaving(true);

      // --- загрузка фото через /api/upload ---
      let imgUrl = null;
      if (file) {
        const fdUpload = new FormData();
        fdUpload.append("files", file);
        const { data } = await api.post("/api/upload", fdUpload);
        imgUrl = data?.[0] || null;
      }

      // --- сохранение группы ---
      await api.post("/api/groups", {
        name,
        description,
        parentId,
        img: imgUrl,
      });

      navigate("/admin/groups");
    } catch (err) {
      alert("Ошибка сохранения: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-content with-submenu add-group groups-page">
      <AdminSubMenu type="products" activeKey="groups" />

      {/* Topbar */}
      <div className="cg-topbar">
        <button
          type="button"
          className="btn-ghost cg-back"
          onClick={() => navigate("/admin/groups")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Назад
        </button>

        <button
          type="submit"
          form="cg-form"
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      {/* Content */}
      <div className="cg-content-wrap">
        <form id="cg-form" className="layout-grid" onSubmit={handleSubmit}>
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
                <select
                  value={parentId || ""}
                  onChange={(e) => setParentId(e.target.value || null)}
                >
                  <option value="">(Верхний уровень)</option>
                  {groups
                    .filter((g) => g.name !== "Родительская группа")
                    .map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="field-col">
                <label>Описание</label>
                <LocalEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Краткое описание группы (необязательно)"
                  minHeight={180}
                />
              </div>
            </div>
          </div>

          {/* Правая колонка */}
          <div className="side-col">
            <div className="card">
              <div className="card-title">Изображение</div>

              <div
                className={`upload-zone ${isDragging ? "dragging" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                role="button"
                tabIndex={0}
                aria-label="Загрузить изображение"
              >
                {!preview ? (
                  <div className="upload-inner">
                    <div className="upload-badge">
                      <span className="plus">+</span>
                    </div>
                    <div className="upload-text">
                      <p>Выберите файл или перетащите сюда</p>
                      <small>
                        Рекомендация: 200×200 • JPG/PNG/WEBP • до 10MB
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="preview-wrap">
                    <div className="preview-frame">
                      <img src={preview} alt="preview" />
                    </div>
                    <div className="preview-actions">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={clearImage}
                      >
                        Удалить
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => fileRef.current?.click()}
                      >
                        Заменить
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={onFileInput}
                />
              </div>

              <div className="hint">
                Изображение используется в списках и карточке группы.
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

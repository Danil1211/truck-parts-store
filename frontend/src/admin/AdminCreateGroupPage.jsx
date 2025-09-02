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
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null);
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Введите название группы");
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("parentId", parentId);
      if (fileRef.current?.files[0]) {
        fd.append("image", fileRef.current.files[0]);
      }
      await api.post("/api/groups", fd);
      navigate("/admin/groups");
    } catch (err) {
      alert("Ошибка сохранения: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-group groups-page">
      <AdminSubMenu type="groups" activeKey="create" />

      <div className="cg-topbar">
        <button className="btn-ghost" onClick={() => navigate("/admin/groups")}>
          ← Назад
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

      <div className="cg-content-wrap">
        <form id="cg-form" className="cg-grid" onSubmit={handleSubmit}>
          {/* ====== Левая колонка ====== */}
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
                />
              </div>

              <div className="field-col">
                <label>Родительская группа</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
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
                <LocalEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Краткое описание группы (необязательно)"
                  minHeight={180}
                />
              </div>
            </div>
          </div>

          {/* ====== Правая колонка ====== */}
          <div className="side-col">
            <div className="card">
              <div className="card-title">Изображение</div>
              <div
                className="upload-box"
                onClick={() => fileRef.current?.click()}
              >
                {!preview ? (
                  <div className="upload-placeholder">
                    <span className="icon">📷</span>
                    <p>Выберите файл или перетащите сюда</p>
                    <small>200×200 • JPG, PNG, WEBP • до 10MB</small>
                  </div>
                ) : (
                  <div className="preview-wrap">
                    <img src={preview} alt="preview" />
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setPreview(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

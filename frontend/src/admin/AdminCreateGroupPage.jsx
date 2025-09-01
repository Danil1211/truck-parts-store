// frontend/src/admin/AdminCreateGroupPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminCreateGroupPage.css";

const DRAFT_KEY = "cg_draft_v1";

export default function AdminCreateGroupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [parentQuery, setParentQuery] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [errors, setErrors] = useState({});

  // Подгружаем группы
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/api/groups");
        if (mounted) setGroups(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setGroups([]);
      } finally {
        if (mounted) setLoadingGroups(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // Загружаем черновик (если форма пустая)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!name && !description && !preview && !parentId) {
        if (draft?.name) setName(draft.name);
        if (draft?.parentId) setParentId(draft.parentId);
        if (draft?.description) setDescription(draft.description);
        if (draft?.preview) setPreview(draft.preview);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Автосохранение черновика (debounce 600 мс)
  useEffect(() => {
    const id = setTimeout(() => {
      const draft = { name, parentId, description, preview };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {}
    }, 600);
    return () => clearTimeout(id);
  }, [name, parentId, description, preview]);

  // Горячие клавиши: Ctrl/Cmd+S — сохранить, Esc — назад (с предупреждением)
  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        const btn = document.querySelector(".cg-save-top");
        if (btn && !btn.disabled) btn.click();
      }
      if (key === "escape") {
        if (dirty && !saving) {
          const ok = window.confirm("Есть несохранённые изменения. Выйти без сохранения?");
          if (!ok) return;
        }
        navigate("/admin/groups");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, navigate]);

  // Предупреждение при несохранённых изменениях
  useEffect(() => {
    const handler = (e) => {
      if (dirty && !saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  // Опорная "верхняя" группа (может быть, может не быть)
  const ROOT_GROUP = useMemo(
    () => groups.find((g) => g.name === "Родительская группа" && !g.parentId),
    [groups]
  );

  // Список доступных родителей + фильтр
  const availableParents = useMemo(() => {
    const excludeRootId = ROOT_GROUP && ROOT_GROUP._id;
    const base = groups.filter((g) => g._id !== excludeRootId);
    if (!parentQuery.trim()) return base;
    const q = parentQuery.toLowerCase();
    return base.filter((g) => (g.name || "").toLowerCase().includes(q));
  }, [groups, ROOT_GROUP, parentQuery]);

  const setDirtyValue = (setter) => (v) => {
    setDirty(true);
    const value = typeof v === "function" ? v : v?.target ? v.target.value : v;
    setter(value);
  };

  // Валидация
  const validate = () => {
    const next = {};
    const n = name.trim();
    if (!n) next.name = "Введите название группы";
    else if (n.length < 2) next.name = "Слишком короткое название";
    else if (n.length > 120) next.name = "Слишком длинное название (до 120 символов)";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Работа с изображением
  const handleImageFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Файл слишком большой (макс. 10MB)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => handleImageFile(e.target.files?.[0]);

  // drag overlay
  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleImageFile(file);
  };

  const handlePaste = (e) => {
    const fileItem = Array.from(e.clipboardData.items || []).find((i) => i.kind === "file");
    if (fileItem) handleImageFile(fileItem.getAsFile());
  };

  const clearPreview = () => {
    setPreview(null);
    setDirty(true);
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!validate()) return;

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
        setDirty(false);
        clearDraft();
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
    <div className="admin-root">
      <AdminSubMenu
        title="Управление товарами"
        items={[
          { label: "Товары", to: "/admin/products" },
          { label: "Группы", to: "/admin/groups", active: true },
        ]}
      />

      <div className="admin-content">
        <div className="cg-container">
          <form className="cg-card" onSubmit={handleSaveGroup} onPaste={handlePaste}>
            {/* Sticky-заголовок внутри карточки */}
            <div className="cg-head">
              <div className="cg-head-title">
                <h1>Добавить группу</h1>
                {dirty && <span className="cg-dot">● Черновик</span>}
              </div>
              <div className="cg-head-actions">
                <button
                  type="button"
                  className="cg-btn-ghost"
                  onClick={() => {
                    if (dirty && !saving) {
                      const ok = window.confirm("Есть несохранённые изменения. Выйти без сохранения?");
                      if (!ok) return;
                    }
                    navigate("/admin/groups");
                  }}
                >
                  Назад
                </button>
                <button
                  type="submit"
                  className="cg-save-top"
                  disabled={saving || !!errors.name || !name.trim()}
                  title="Ctrl/Cmd + S"
                >
                  {saving ? "Сохраняем…" : "Сохранить"}
                </button>
              </div>
            </div>

            {/* Левая колонка */}
            <div className="cg-left">
              <div className="cg-block">
                <label>Название группы</label>
                <div className={`cg-input-wrap ${errors.name ? "is-invalid" : ""}`}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setDirtyValue(setName)(e);
                      if (errors.name) validate();
                    }}
                    onBlur={validate}
                    placeholder="Введите название группы"
                    aria-invalid={!!errors.name}
                    required
                  />
                  <span className="cg-input-icon" aria-hidden="true">📦</span>
                </div>
                {errors.name ? (
                  <div className="cg-error">{errors.name}</div>
                ) : (
                  <div className="cg-hint">
                    Коротко и понятно: «Амортизаторы», «Колодки тормозные»
                  </div>
                )}
              </div>

              <div className="cg-block">
                <label>Родительская группа</label>
                <div className="cg-inline">
                  <div className="cg-input-wrap">
                    <input
                      className="cg-parent-filter"
                      type="text"
                      value={parentQuery}
                      onChange={setDirtyValue(setParentQuery)}
                      placeholder="Фильтр по названию…"
                    />
                    <span className="cg-input-icon" aria-hidden="true">🔎</span>
                  </div>
                  <select
                    value={parentId}
                    onChange={setDirtyValue(setParentId)}
                    disabled={loadingGroups}
                  >
                    <option value={ROOT_GROUP?._id || ""}>
                      Родительская группа (верхний уровень)
                    </option>
                    {availableParents.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                {loadingGroups && <div className="cg-skeleton">Загрузка групп…</div>}
              </div>

              <div className="cg-block">
                <label>Описание</label>
                <div className="cg-input-wrap">
                  <textarea
                    value={description}
                    onChange={setDirtyValue(setDescription)}
                    placeholder="Краткое описание группы (необязательно)"
                    rows={5}
                  />
                  <span className="cg-input-icon" aria-hidden="true">✏️</span>
                </div>
              </div>
            </div>

            {/* Правая колонка */}
            <div className="cg-right">
              <div className="cg-block">
                <label>Изображение</label>

                <div
                  className={`cg-upload ${preview ? "has-image" : ""} ${dragActive ? "drag-active" : ""}`}
                  onDragEnter={onDragEnter}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={handleDrop}
                  title="Перетащите файл сюда или нажмите для выбора. Можно вставить из буфера (Ctrl/Cmd+V)."
                >
                  {!preview && (
                    <>
                      <input type="file" accept="image/*" onChange={handleImageChange} />
                      <p>200×200 • JPG, PNG, WEBP • до 10MB</p>
                      <span className="cg-upload-badge">Drag & Drop / Paste</span>
                    </>
                  )}

                  {preview && (
                    <div className="cg-preview-card">
                      <img src={preview} alt="Preview" className="cg-preview" />
                      <div className="cg-preview-actions">
                        <button type="button" className="cg-btn-ghost" onClick={clearPreview}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  )}

                  {dragActive && (
                    <div className="cg-drop-overlay">
                      <div className="cg-drop-inner">Отпустите файл для загрузки</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="cg-side-hint">
                ⌘/Ctrl + S — сохранить • Можно вставить картинку из буфера • Drag & Drop поддерживается
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

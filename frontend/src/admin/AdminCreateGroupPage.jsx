import React, { useState, useEffect, useMemo } from "react";
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
  const [dirty, setDirty] = useState(false);
  const [parentQuery, setParentQuery] = useState("");

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

  // Ctrl/Cmd + S — сохранить
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const btn = document.querySelector(".cg-save");
        if (btn && !btn.disabled) btn.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // предупреждение при несохранённых изменениях
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

  const ROOT_GROUP = useMemo(
    () => groups.find((g) => g.name === "Родительская группа" && !g.parentId),
    [groups]
  );

  const availableParents = useMemo(() => {
    const list = groups.filter((g) => g._id !== (ROOT_GROUP && ROOT_GROUP._id));
    if (!parentQuery.trim()) return list;
    const q = parentQuery.toLowerCase();
    return list.filter((g) => (g.name || "").toLowerCase().includes(q));
  }, [groups, ROOT_GROUP, parentQuery]);

  const setDirtyValue = (setter) => (v) => {
    setDirty(true);
    setter(typeof v === "function" ? v : v.target ? v.target.value : v);
  };

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

  const handleDrop = (e) => {
    e.preventDefault();
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
        setDirty(false);
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
      {/* наше субменю */}
      <AdminSubMenu
        title="Управление товарами"
        items={[
          { label: "Товары", to: "/admin/products" },
          { label: "Группы", to: "/admin/groups", active: true },
        ]}
      />

      <div className="admin-content">
        {/* резервируем место слева под субменю, чтобы форма не залезала */}
        <div className="cg-container">
          <form className="cg-card" onSubmit={handleSaveGroup}>
            {/* левая колонка */}
            <div className="cg-left">
              <h1>Добавить группу</h1>

              <div className="cg-block">
                <label>Название группы</label>
                <input
                  type="text"
                  value={name}
                  onChange={setDirtyValue(setName)}
                  placeholder="Введите название группы"
                  required
                />
                <div className="cg-hint">Коротко и понятно: «Амортизаторы», «Колодки тормозные»</div>
              </div>

              <div className="cg-block">
                <label>Родительская группа</label>
                <div className="cg-inline">
                  <input
                    className="cg-parent-filter"
                    type="text"
                    value={parentQuery}
                    onChange={setDirtyValue(setParentQuery)}
                    placeholder="Фильтр по названию…"
                  />
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
                <textarea
                  value={description}
                  onChange={setDirtyValue(setDescription)}
                  placeholder="Краткое описание группы (необязательно)"
                />
              </div>
            </div>

            {/* правая колонка */}
            <div className="cg-right">
              <div className="cg-block">
                <label>Изображение</label>
                <div
                  className={`cg-upload ${preview ? "has-image" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onPaste={handlePaste}
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
                    <div className="cg-preview-wrap">
                      <img src={preview} alt="Preview" className="cg-preview" />
                      <button type="button" className="cg-btn-ghost" onClick={clearPreview}>
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="cg-save"
                disabled={saving || !name.trim()}
                title="Ctrl/Cmd + S"
              >
                {saving ? "Сохраняем…" : "Сохранить группу"}
              </button>
            </div>
          </form>

          <div className="cg-shortcuts">
            ⌘/Ctrl + S — сохранить • Перетащите/вставьте изображение в область загрузки
          </div>
        </div>
      </div>
    </div>
  );
}

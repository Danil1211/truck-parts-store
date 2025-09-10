// frontend/src/admin/AdminEditGroupPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";
import LocalEditor from "../components/LocalEditor";

// используем те же базовые стили, что и на создании
import "../assets/AdminPanel.css";
import "../assets/AdminCreateGroupPage.css";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

export default function AdminEditGroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // поля
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(null);
  const [description, setDescription] = useState("");

  // группы для селекта
  const [groups, setGroups] = useState([]);

  // загрузка/сохранение
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // картинка: serverPath — что лежит/будет лежать на сервере; preview — что показываем (blob/url)
  const [serverPath, setServerPath] = useState(null as null | string);
  const [preview, setPreview] = useState(null as null | string);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // helpers
  const toAbs = (p?: string | null) =>
    !p ? null : p.startsWith("http") ? p : `${BASE_URL}${p}`;

  // revoke blob url при замене
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // начальная загрузка
  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      try {
        const [{ data: allGroups }, { data: grp }] = await Promise.all([
          api.get("/api/groups"),
          api.get(`/api/groups/${id}`),
        ]);

        setGroups(Array.isArray(allGroups) ? allGroups : []);
        setName(grp?.name || "");
        setParentId(grp?.parentId || null);
        setDescription(grp?.description || "");

        const img = grp?.img || null;
        setServerPath(img);
        setPreview(toAbs(img));
      } catch (e) {
        console.error("Ошибка загрузки группы", e);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [id]);

  // загрузка файла
  const applyFile = (f: File) => {
    if (!f) return;
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    // при замене файла сразу “обнулим” старый serverPath — он станет новым после upload
    setServerPath(null);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const clearImage = () => {
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setServerPath(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // сохранение
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Введите название группы");

    try {
      setSaving(true);

      // если выбран новый файл — загружаем
      let imgPath = serverPath;
      if (file) {
        const fd = new FormData();
        fd.append("files", file);
        const { data } = await api.post("/api/upload", fd);
        imgPath = data?.[0] || null;
      }
      // если нажали “Удалить” — serverPath уже null + file=null => удаляем
      await api.put(`/api/groups/${id}`, {
        name,
        description,
        parentId: parentId || null,
        img: imgPath || null,
      });

      navigate("/admin/groups");
    } catch (err: any) {
      alert("Не удалось сохранить: " + (err?.response?.data?.error || err?.message));
    } finally {
      setSaving(false);
    }
  };

  // списки для селекта (нельзя выбрать саму себя)
  const parentOptions = groups
    .filter((g) => g._id !== id && g.name !== "Родительская группа")
    .map((g) => ({ value: g._id, label: g.name }));

  return (
    <div className="admin-content with-submenu add-group">
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
          form="eg-form"
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      {/* Content */}
      <div className="cg-content-wrap">
        {initialLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background:
                  "conic-gradient(#117fff 0 85deg, #e6ecf4 85deg 360deg)",
                animation: "egSpin 1s linear infinite",
                position: "relative",
              }}
            >
              <span
                style={{
                  content: "''",
                  position: "absolute",
                  inset: 3.5,
                  background: "#fff",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            </span>
            <style>{`@keyframes egSpin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <form id="eg-form" className="layout-grid" onSubmit={handleSubmit}>
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
                    {parentOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
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
        )}
      </div>
    </div>
  );
}

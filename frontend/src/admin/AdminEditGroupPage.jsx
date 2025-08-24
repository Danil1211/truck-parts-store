// frontend/src/admin/AdminEditGroupPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api.js";

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

export default function AdminEditGroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null); // base64 или относительный/абсолютный URL
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // helper: загрузка JSON через axios
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
      setLoading(true);
      try {
        // все группы (дерево/плоский — принимаем как есть)
        const dataGroups = await axiosSafe(() => api.get("/api/groups"));
        setGroups(Array.isArray(dataGroups) ? dataGroups : []);

        // конкретная группа
        const group = await axiosSafe(() => api.get(`/api/groups/${id}`));
        setName(group.name || "");
        setDescription(group.description || "");

        const rootId =
          (Array.isArray(dataGroups)
            ? dataGroups.find((g) => g.name === "Родительская группа" && !g.parentId)?._id
            : null) || "";

        setParentId(group.parentId || rootId || "");

        // img может прийти относительным путём; для превью подставим BASE_URL при отрисовке
        setPreview(group.img || null);
      } catch (err) {
        console.error("Ошибка загрузки группы:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return setPreview(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result); // base64
    reader.readAsDataURL(file);
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        parentId: parentId || null,
        description: description || "",
        img: preview || null, // можно отправлять base64 или оставить прежний путь
      };

      await axiosSafe(() => api.put(`/api/groups/${id}`, payload));
      navigate("/admin/groups");
    } catch (err) {
      alert(err.message || "Ошибка при обновлении группы");
    } finally {
      setSaving(false);
    }
  };

  const ROOT_GROUP = groups.find((g) => g.name === "Родительская группа" && !g.parentId);
  const availableParents = groups.filter(
    (g) => g._id !== id && g._id !== (ROOT_GROUP && ROOT_GROUP._id)
  );

  const displayPreview =
    preview && (preview.startsWith("http") || preview.startsWith("data:"))
      ? preview
      : preview
      ? `${BASE_URL}${preview}`
      : null;

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 80, color: "#2291ff" }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6fafd",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "44px 0 60px 0",
      }}
    >
      <div style={{ position: "absolute", left: 60, top: 38, zIndex: 10 }}>
        <button
          type="button"
          onClick={() => navigate("/admin/groups")}
          style={{
            display: "flex",
            alignItems: "center",
            background: "#eaf4ff",
            color: "#2291ff",
            border: "none",
            fontWeight: 700,
            fontSize: 18,
            borderRadius: 11,
            padding: "10px 20px 10px 14px",
            boxShadow: "0 2px 12px #2291ff11",
            cursor: "pointer",
            gap: 8,
          }}
        >
          ◀ Назад
        </button>
      </div>

      <form
        onSubmit={handleUpdateGroup}
        style={{
          background: "#fff",
          borderRadius: 24,
          maxWidth: 900,
          width: "100%",
          boxShadow: "0 8px 32px #2291ff12",
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          marginTop: 34,
        }}
      >
        {/* левая часть */}
        <div
          style={{
            flex: 2,
            padding: "40px 38px 38px 38px",
            borderRight: "1.5px solid #eaf1fa",
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1b2437" }}>
            Редактировать группу
          </h1>

          <label>Название группы</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1.3px solid #cfe6ff",
              background: "#f7fbff",
            }}
          />

          <label>Родительская группа</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1.3px solid #cfe6ff",
              background: "#f7fbff",
            }}
          >
            <option value={ROOT_GROUP?._id || ""}>Родительская группа</option>
            {availableParents.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>

          <label>Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1.3px solid #cfe6ff",
              background: "#f7fbff",
              minHeight: 120,
            }}
          />
        </div>

        {/* правая часть */}
        <div style={{ flex: 1.25, padding: "40px 34px 38px 34px" }}>
          <label>Изображение группы</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {displayPreview && (
            <img
              src={displayPreview}
              alt="preview"
              style={{ maxWidth: 220, marginTop: 10, borderRadius: 10 }}
            />
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 22,
              background: "#2291ff",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 18px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              boxShadow: "0 2px 10px #2291ff1a",
              fontWeight: 700,
            }}
          >
            {saving ? "Сохраняем..." : "Сохранить изменения"}
          </button>
        </div>
      </form>
    </div>
  );
}

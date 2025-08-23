// frontend/src/admin/AdminEditGroupPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";

export default function AdminEditGroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const authHeaders = {};
  const token = localStorage.getItem("token");
  if (token) authHeaders.Authorization = `Bearer ${token}`;

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(`Не JSON (${res.status}). ${text.slice(0, 120)}`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const dataGroups = await fetchJSON(`${API}/api/groups`, { headers: authHeaders });
        setGroups(Array.isArray(dataGroups) ? dataGroups : []);

        const group = await fetchJSON(`${API}/api/groups/${id}`, { headers: authHeaders });
        setName(group.name || "");
        setDescription(group.description || "");
        setParentId(
          group.parentId ||
            dataGroups.find((g) => g.name === "Родительская группа" && !g.parentId)?._id ||
            ""
        );
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
        img: preview || null,
      };

      await fetchJSON(`${API}/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });

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

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: 80, color: "#2291ff" }}>Загрузка...</div>;
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
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1b2437" }}>Редактировать группу</h1>

          <label>Название группы</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />

          <label>Родительская группа</label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value={ROOT_GROUP?._id || ""}>Родительская группа</option>
            {availableParents.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>

          <label>Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* правая часть */}
        <div style={{ flex: 1.25, padding: "40px 34px 38px 34px" }}>
          <label>Изображение группы</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {preview && (
            <img src={preview} alt="preview" style={{ maxWidth: 200, marginTop: 10 }} />
          )}

          <button type="submit" disabled={saving}>
            {saving ? "Сохраняем..." : "Сохранить изменения"}
          </button>
        </div>
      </form>
    </div>
  );
}

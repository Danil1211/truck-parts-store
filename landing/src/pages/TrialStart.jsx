// landing/src/pages/TrialStart.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export default function TrialStart() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/public/trial/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Ошибка запуска триала");
      } else {
        // редиректим сразу в админку с токеном и tenantId
        window.location.href = `/admin?token=${data.token}&tid=${data.tenantId}`;
      }
    } catch {
      setErr("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: 360,
          padding: 24,
          borderRadius: 12,
          background: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,.06)",
        }}
      >
        <h2 style={{ marginBottom: 16, textAlign: "center" }}>
          🚀 Начни бесплатно
        </h2>

        <input
          type="text"
          name="name"
          placeholder="Ваше имя"
          value={form.name}
          onChange={onChange}
          required
          style={{
            width: "100%",
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
        <input
          type="email"
          name="email"
          placeholder="E-mail"
          value={form.email}
          onChange={onChange}
          required
          style={{
            width: "100%",
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
        <input
          type="tel"
          name="phone"
          placeholder="Телефон"
          value={form.phone}
          onChange={onChange}
          style={{
            width: "100%",
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />

        {err && (
          <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: 0,
            background: "#4f46e5",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Создаю…" : "Начать бесплатно"}
        </button>
      </form>
    </div>
  );
}

// landing/src/pages/TrialStart.jsx
import React, { useState } from "react";

const API =
  (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "") ||
  "https://api.storo-shop.com";

export default function TrialStart() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/public/trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка запуска триала");

      // если успешно → редиректим на админку с токеном
      if (data.token && data.tenantId) {
        const url = `https://${data.subdomain}.storo-shop.com/admin?token=${data.token}&tid=${data.tenantId}`;
        window.location.href = url;
      } else {
        setOk("✅ Магазин создан! Проверьте почту для деталей.");
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 20 }}>
      <h1>Создать магазин бесплатно</h1>
      <p>14 дней бесплатного доступа, без привязки карты.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Ваш email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="text"
          placeholder="Название компании / магазина"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="tel"
          placeholder="Телефон"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />

        {err && <div style={{ color: "crimson" }}>{err}</div>}
        {ok && <div style={{ color: "green" }}>{ok}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 10,
            border: 0,
            background: "#4f46e5",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Создаю..." : "Создать магазин бесплатно"}
        </button>
      </form>
    </div>
  );
}

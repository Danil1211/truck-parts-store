import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API = import.meta.env.VITE_API_URL || "";

// Простейшие тарифы (можешь подгружать с бекенда /api/public/plans)
const PLAN_LABELS = {
  free: "Free — старт",
  basic: "Basic — растём",
  pro: "Pro — масштаб",
};

function App() {
  const [company, setCompany] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("free");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setHint("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/public/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, subdomain, email, password, plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        // сервер в catch отдаёт { error: '...' }
        setError(data?.error || "Ошибка сервера");
        return;
      }

      // ✅ Бэкенд должен вернуть loginUrl
      if (data.loginUrl) {
        window.location.href = data.loginUrl;
        return;
      }

      // fallback, если вдруг loginUrl не пришёл
      setHint(
        `Готово! Ваш поддомен: ${data.subdomain}.shopik.com. Откройте страницу входа магазина.`
      );
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Shopik — запусти магазин за 60 секунд</h1>
      <p>
        Демо:{" "}
        <a href="https://demo.shopik.com" target="_blank" rel="noreferrer">
          demo.shopik.com
        </a>
      </p>

      <h2>Начать бесплатно</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Компания"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            placeholder="Поддомен (например, demo)"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.trim())}
            required
            style={{ flex: 1 }}
          />
          <span>.shopik.com</span>
        </div>

        <input
          type="email"
          placeholder="Email владельца"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          required
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Выбор тарифа */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Тариф</label>
          <div style={{ display: "flex", gap: 16 }}>
            {["free", "basic", "pro"].map((p) => (
              <label key={p} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="plan"
                  value={p}
                  checked={plan === p}
                  onChange={() => setPlan(p)}
                />
                {PLAN_LABELS[p]}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Создаём..." : "Создать магазин"}
        </button>
      </form>

      {error && <p style={{ color: "crimson", marginTop: 12 }}>Ошибка: {error}</p>}
      {hint && <p style={{ color: "green", marginTop: 12 }}>{hint}</p>}

      <h2 style={{ marginTop: 32 }}>Тарифы</h2>
      <ul>
        <li>Free — старт</li>
        <li>Basic — растём</li>
        <li>Pro — масштаб</li>
      </ul>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

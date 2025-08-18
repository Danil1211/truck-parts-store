// src/App.jsx
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

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
        setError(data?.error || "Ошибка сервера");
        return;
      }

      // ——— ЖЕЛЕЗОБЕТОННЫЙ РЕДИРЕКТ ———
      // 1) если сервер вернул loginUrl — используем его
      // 2) иначе строим URL из введённого поддомена
      const fallbackUrl = `https://${subdomain.trim().toLowerCase()}.storo-shop.com/admin/login`;
      const redirectTo = data.loginUrl || fallbackUrl;

      // моментальный переход
      window.location.assign(redirectTo);
      return;
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <section className="text-center py-20 px-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-indigo-700 mb-4">
          Запусти интернет-магазин за 60 секунд
        </h1>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          Storo — платформа для запуска магазина без программиста.
        </p>
        <a href="#signup" className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition">
          Создать магазин бесплатно
        </a>
      </section>

      <section id="signup" className="py-20 px-6">
        <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-indigo-600 mb-6">Начни бесплатно</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              className="w-full px-4 py-3 border rounded-lg"
              placeholder="Компания"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />

            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-4 py-3 border rounded-lg"
                placeholder="Поддомен (например, demo)"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                required
              />
              <span className="text-gray-600">.storo-shop.com</span>
            </div>

            <input
              type="email"
              className="w-full px-4 py-3 border rounded-lg"
              placeholder="Email владельца"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              className="w-full px-4 py-3 border rounded-lg"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div>
              <label className="block font-medium mb-1">Тариф</label>
              <div className="flex gap-4 flex-wrap">
                {["free", "basic", "pro"].map((p) => (
                  <label key={p} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${plan === p ? "border-indigo-500 bg-indigo-50" : "border-gray-300"}`}>
                    <input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} />
                    {PLAN_LABELS[p]}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg shadow-md hover:bg-indigo-700 transition">
              {loading ? "Создаём..." : "Создать магазин"}
            </button>
          </form>

          {error && <p className="text-red-500 mt-4">Ошибка: {error}</p>}
          {hint && <p className="text-green-600 mt-4">{hint}</p>}
        </div>
      </section>

      <footer className="py-6 text-center text-gray-500 border-t">
        © {new Date().getFullYear()} Storo
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

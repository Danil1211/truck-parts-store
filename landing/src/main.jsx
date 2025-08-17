import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API = import.meta.env.VITE_API_URL || "";

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

      if (data.loginUrl) {
        window.location.href = data.loginUrl;
        return;
      }

      setHint(
        `✅ Готово! Ваш магазин: https://${data.subdomain}.storo-shop.com`
      );
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">
          Storo-Shop — магазин за 60 секунд
        </h1>
        <p className="text-gray-600 mb-6">
          Демо:{" "}
          <a
            href="https://demo.storo-shop.com"
            className="text-indigo-600 font-medium hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            demo.storo-shop.com
          </a>
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none transition"
            placeholder="Компания"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />

          <div className="flex items-center gap-2">
            <input
              className="flex-1 px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none transition"
              placeholder="Поддомен (например, demo)"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.trim())}
              required
            />
            <span className="text-gray-600">.storo-shop.com</span>
          </div>

          <input
            type="email"
            className="w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none transition"
            placeholder="Email владельца"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            required
          />

          <input
            type="password"
            className="w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none transition"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div>
            <label className="block font-medium mb-1">Тариф</label>
            <div className="flex gap-4">
              {["free", "basic", "pro"].map((p) => (
                <label
                  key={p}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition hover:shadow-md ${
                    plan === p
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-300"
                  }`}
                >
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg shadow-md hover:bg-indigo-700 transition active:scale-[0.98]"
          >
            {loading ? "Создаём..." : "🚀 Создать магазин"}
          </button>
        </form>

        {error && <p className="text-red-500 mt-4">❌ Ошибка: {error}</p>}
        {hint && <p className="text-green-600 mt-4">{hint}</p>}

        <h2 className="text-xl font-semibold mt-8 mb-2">Тарифы</h2>
        <ul className="space-y-1 text-gray-700 list-disc pl-4">
          <li>Free — старт</li>
          <li>Basic — растём</li>
          <li>Pro — масштаб</li>
        </ul>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

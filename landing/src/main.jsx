import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import "./index.css";

const API = import.meta.env.VITE_API_URL || "";

const PLANS = [
  { key: "free", title: "Free", desc: "Старт для теста и первых клиентов", price: "0₴" },
  { key: "basic", title: "Basic", desc: "Растём и подключаем продажи", price: "299₴/мес" },
  { key: "pro", title: "Pro", desc: "Масштабируем бизнес без ограничений", price: "999₴/мес" },
];

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
        `Готово! Ваш поддомен: ${data.subdomain}.storo-shop.com. Перейдите в магазин.`
      );
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 flex flex-col items-center py-12 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-sky-700 text-center"
      >
        Storo Shop — создайте магазин за 60 секунд
      </motion.h1>

      <p className="mt-2 text-gray-600 text-center">
        Демо:{" "}
        <a
          href="https://demo.storo-shop.com"
          target="_blank"
          rel="noreferrer"
          className="text-sky-600 hover:underline"
        >
          demo.storo-shop.com
        </a>
      </p>

      {/* Форма */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-lg bg-white mt-8 shadow-lg rounded-2xl p-8"
      >
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Начните бесплатно
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 outline-none"
            placeholder="Компания"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />

          <div className="flex items-center gap-2">
            <input
              className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 outline-none"
              placeholder="Поддомен (например, demo)"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.trim())}
              required
            />
            <span className="text-gray-600">.storo-shop.com</span>
          </div>

          <input
            type="email"
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 outline-none"
            placeholder="Email владельца"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            required
          />

          <input
            type="password"
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 outline-none"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div>
            <label className="font-semibold">Тариф</label>
            <div className="flex gap-6 mt-2">
              {PLANS.map((p) => (
                <label
                  key={p.key}
                  className={`flex items-center gap-2 cursor-pointer transition ${
                    plan === p.key ? "text-sky-600 font-medium" : "text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={p.key}
                    checked={plan === p.key}
                    onChange={() => setPlan(p.key)}
                  />
                  {p.title}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-3 rounded-lg font-medium hover:bg-sky-700 transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Создаём..." : "Создать магазин"}
          </button>
        </form>

        {error && (
          <p className="text-red-600 text-center mt-4">Ошибка: {error}</p>
        )}
        {hint && <p className="text-green-600 text-center mt-4">{hint}</p>}
      </motion.div>

      {/* Тарифы */}
      <h2 className="text-3xl font-bold mt-16 text-gray-800">Тарифы</h2>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        {PLANS.map((p, i) => (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            whileHover={{ y: -6 }}
            className={`rounded-2xl shadow-lg p-6 bg-white text-center transition border ${
              plan === p.key ? "border-sky-500" : "border-transparent"
            }`}
          >
            <h3 className="text-xl font-semibold text-sky-600">{p.title}</h3>
            <p className="text-3xl font-bold mt-2">{p.price}</p>
            <p className="text-gray-600 mt-2">{p.desc}</p>
            <button
              onClick={() => setPlan(p.key)}
              className="mt-4 w-full bg-sky-600 text-white py-2 rounded-lg hover:bg-sky-700 transition"
            >
              Выбрать
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

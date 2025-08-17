// src/App.jsx
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
        `Готово! Ваш поддомен: ${data.subdomain}.storo-shop.com. Откройте страницу входа магазина.`
      );
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* HERO */}
      <section className="text-center py-20 px-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-indigo-700 mb-4 animate-fadeIn">
          Запусти интернет-магазин за 60 секунд
        </h1>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          Storo — это платформа для создания современного интернет-магазина без
          программиста. Просто зарегистрируйся и начни продавать уже сегодня.
        </p>
        <a
          href="#signup"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition"
        >
          Создать магазин бесплатно
        </a>
      </section>

      {/* ПРЕИМУЩЕСТВА */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
          {[
            { title: "⚡ Быстрый запуск", text: "Готовый магазин за 1 минуту" },
            { title: "📱 Современный дизайн", text: "Адаптивно под все устройства" },
            { title: "💳 Приём платежей", text: "Подключение карт и сервисов" },
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-xl shadow-md hover:shadow-xl transition">
              <h3 className="text-xl font-semibold text-indigo-600 mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ВОЗМОЖНОСТИ */}
      <section className="py-20 px-6">
        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-10">
          Возможности платформы
        </h2>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            "Управление товарами и заказами",
            "Поддержка чата с клиентами",
            "Автоматическая интеграция с Новой Почтой",
            "Гибкие настройки дизайна",
            "SEO и продвижение",
            "Аналитика и отчёты",
          ].map((text, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-xl shadow-md hover:scale-[1.02] transition"
            >
              <p className="text-gray-700">✅ {text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ЧТО ПОЛУЧИТ КЛИЕНТ */}
      <section className="py-16 bg-indigo-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-indigo-700 mb-8">
            Что получаешь после регистрации?
          </h2>
          <ul className="space-y-4 text-lg text-gray-700">
            <li>🚀 Полностью готовый сайт с корзиной</li>
            <li>🎨 Современный дизайн магазина</li>
            <li>
              🔗 Личный поддомен вида <b>вашмагазин.storo-shop.com</b>
            </li>
            <li>📦 Управление товарами и заказами</li>
            <li>💳 Возможность принимать онлайн-оплаты</li>
          </ul>
        </div>
      </section>

      {/* ФОРМА РЕГИСТРАЦИИ */}
      <section id="signup" className="py-20 px-6">
        <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-indigo-600 mb-6">
            Начни бесплатно
          </h2>

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
              <div className="flex gap-4 flex-wrap">
                {["free", "basic", "pro"].map((p) => (
                  <label
                    key={p}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition hover:shadow-md ${
                      plan === p ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
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
              {loading ? "Создаём..." : "Создать магазин"}
            </button>
          </form>

          {error && <p className="text-red-500 mt-4">Ошибка: {error}</p>}
          {hint && <p className="text-green-600 mt-4">{hint}</p>}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 text-center text-gray-500 border-t">
        © {new Date().getFullYear()} Storo. Все права защищены.
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

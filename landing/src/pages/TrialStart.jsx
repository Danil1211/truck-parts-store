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
        body: JSON.stringify({
          email: email.trim(),
          company: company.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка запуска триала");

      // ✅ автологин
      if (data.token && data.tenantId && data.subdomain) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("tenantId", data.tenantId);
        localStorage.setItem("role", "admin");

        window.location.href = `https://${data.subdomain}.storo-shop.com/admin/orders`;
        return;
      }

      if (data.loginUrl) {
        window.location.href = data.loginUrl;
        return;
      }

      setOk("✅ Магазин создан! Проверьте почту для деталей.");
    } catch (e) {
      setErr(e.message || "Ошибка запуска триала");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-100 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        {/* Заголовок */}
        <h1 className="text-3xl font-extrabold text-slate-900 text-center">
          Создать магазин бесплатно
        </h1>
        <p className="mt-3 text-center text-slate-600">
          14 дней бесплатного доступа <br />
          <span className="text-indigo-600 font-semibold">без привязки карты</span>
        </p>

        {/* Форма */}
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Ваш email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Название компании / магазина"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <input
            type="tel"
            placeholder="Телефон (необязательно)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          {err && <div className="text-red-600 text-sm">{err}</div>}
          {ok && <div className="text-green-600 text-sm">{ok}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition disabled:opacity-70"
          >
            {loading ? "Создаю..." : "Создать магазин бесплатно"}
          </button>
        </form>

        {/* Доп. инфо */}
        <p className="mt-6 text-center text-slate-500 text-sm">
          Нажимая кнопку, вы соглашаетесь с{" "}
          <a href="/terms" className="text-indigo-600 hover:underline">
            условиями использования
          </a>
          .
        </p>
      </div>
    </div>
  );
}

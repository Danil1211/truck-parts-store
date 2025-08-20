// landing/src/pages/Register.jsx
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "";

export default function Register() {
  const [company, setCompany] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("test"); // дефолтно "Тест"
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // --- подхватываем тариф из localStorage ---
  useEffect(() => {
    const savedPlan = localStorage.getItem("selectedPlan");
    if (savedPlan) setPlan(savedPlan);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);

    const sd = subdomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
    if (sd.length < 3) {
      return setMsg({
        type: "error",
        text: "Поддомен минимум 3 символа, латиница/цифры/-",
      });
    }

    setLoading(true);
    try {
      const r = await fetch(`${API}/api/public/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          subdomain: sd,
          email: email.trim(),
          password,
          plan,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Ошибка регистрации");

      // сохраняем для dev
      localStorage.setItem("tenantId", data.tenantId);
      localStorage.setItem("token", data.token);

      // PROD (боевой редирект):
      window.location.href = `https://${data.subdomain}.storo-shop.com/admin`;

      // DEV (оставь если тестируешь локально):
      // window.location.href = "http://localhost:5173/admin";
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Создать магазин</h2>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          className="border rounded p-2"
          placeholder="Компания"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <div className="flex items-center gap-2">
          <input
            className="border rounded p-2 w-full"
            placeholder="Поддомен (например, demo)"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            required
          />
          <span className="text-sm text-slate-600">.storo-shop.com</span>
        </div>
        <input
          className="border rounded p-2"
          type="email"
          placeholder="Email владельца"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="border rounded p-2"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* выбор тарифа */}
        <select
          className="border rounded p-2"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        >
          <option value="test">Тест (14 дней)</option>
          <option value="start">Старт — 5000₴/год</option>
          <option value="medium">Медиум — 9000₴/год</option>
          <option value="pro">Про — 12500₴/год</option>
        </select>

        <button
          disabled={loading}
          className="bg-blue-700 text-white rounded p-2 disabled:opacity-60"
        >
          {loading ? "Создаём..." : "Создать магазин"}
        </button>
      </form>
      {msg && (
        <p
          className={`mt-3 ${
            msg.type === "error" ? "text-red-600" : "text-green-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

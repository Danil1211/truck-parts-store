// landing/src/pages/Home.jsx
import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

export default function Home() {
  const [company, setCompany] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("test");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const tiers = [
    { name: "Тест", price: "0 ₴", desc: "Доступен 14 дней", features: ["Бесплатно"], plan: "test" },
    { name: "Старт", price: "5 000 ₴ / год", desc: "30 дней или на год", features: ["5.000 товаров", "Базовый дизайн"], plan: "start" },
    { name: "Медиум", price: "9 000 ₴ / год", desc: "30 дней или на год", features: ["10.000 товаров", "Дизайн на выбор"], plan: "medium" },
    { name: "Про", price: "12 500 ₴ / год", desc: "30 дней или на год", features: ["15.000 товаров", "Премиум-дизайн"], plan: "pro" },
  ];

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);

    const sd = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+/, "").replace(/-+$/, "");
    if (sd.length < 3) return setMsg({ type: "error", text: "Поддомен минимум 3 символа" });

    setLoading(true);
    try {
      const r = await fetch(`${API}/api/public/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), subdomain: sd, email: email.trim(), password, plan }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Ошибка регистрации");

      localStorage.setItem("tenantId", data.tenantId);
      localStorage.setItem("token", data.token);

      window.location.href = `https://${data.subdomain}.storo-shop.com/admin`;
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* === HEADER === */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-bold text-indigo-600">Storo</h1>
          <nav className="flex gap-6 text-gray-700 font-medium">
            <a href="#about" className="hover:text-indigo-600">О нас</a>
            <a href="#plans" className="hover:text-indigo-600">Тарифы</a>
            <a href="#demo" className="hover:text-indigo-600">Демо</a>
            <a href="#register" className="hover:text-indigo-600">Регистрация</a>
            <a href="#login" className="hover:text-indigo-600">Личный кабинет</a>
          </nav>
        </div>
      </header>

      {/* === HERO === */}
      <section id="about" className="text-center py-20 px-6">
        <h2 className="text-4xl sm:text-5xl font-bold text-indigo-700 mb-4">
          Запусти интернет-магазин за 60 секунд
        </h2>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          Storo — платформа для запуска магазина без программиста.
        </p>
        <a href="#register" className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition">
          Создать магазин бесплатно
        </a>
      </section>

      {/* === PLANS === */}
      <section id="plans" className="py-20 px-6 bg-white">
        <h3 className="text-3xl font-bold text-center text-indigo-600 mb-12">Наши пакеты</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {tiers.map(t => (
            <div key={t.name} className="bg-white rounded-2xl shadow-lg border p-6 flex flex-col text-center hover:shadow-xl transition">
              <h4 className="text-xl font-bold text-indigo-700 mb-2">{t.name}</h4>
              <p className="text-gray-500 mb-2">{t.desc}</p>
              <p className="text-2xl font-bold text-indigo-600 mb-4">{t.price}</p>
              <ul className="text-gray-700 mb-6 space-y-1 text-sm text-left">
                {t.features.map(f => <li key={f}>✔ {f}</li>)}
              </ul>
              <button
                onClick={() => setPlan(t.plan)}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Выбрать тариф
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* === DEMO === */}
      <section id="demo" className="text-center py-20 px-6">
        <h2 className="text-2xl font-bold mb-3">Демо-магазин</h2>
        <p className="mb-4">Посмотрите живой пример с наполнением.</p>
        <a className="text-blue-700 underline" href="https://demo.storo-shop.com" target="_blank" rel="noreferrer">
          Открыть demo.storo-shop.com
        </a>
      </section>

      {/* === REGISTER === */}
      <section id="register" className="py-20 px-6">
        <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-indigo-600 mb-6">Начни бесплатно</h2>
          <form onSubmit={onSubmit} className="grid gap-3">
            <input className="border rounded p-2" placeholder="Компания" value={company} onChange={e=>setCompany(e.target.value)} required />
            <div className="flex items-center gap-2">
              <input className="border rounded p-2 w-full" placeholder="Поддомен (например, demo)" value={subdomain} onChange={e=>setSubdomain(e.target.value)} required />
              <span className="text-sm text-slate-600">.storo-shop.com</span>
            </div>
            <input className="border rounded p-2" type="email" placeholder="Email владельца" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input className="border rounded p-2" type="password" placeholder="Пароль" value={password} onChange={e=>setPassword(e.target.value)} required />

            {/* выбранный тариф */}
            <select className="border rounded p-2" value={plan} onChange={e=>setPlan(e.target.value)}>
              <option value="test">Тест (14 дней)</option>
              <option value="start">Старт — 5000₴/год</option>
              <option value="medium">Медиум — 9000₴/год</option>
              <option value="pro">Про — 12500₴/год</option>
            </select>

            <button disabled={loading} className="bg-indigo-600 text-white rounded p-2 disabled:opacity-60">
              {loading ? "Создаём..." : "Создать магазин"}
            </button>
          </form>
          {msg && <p className={`mt-3 ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>{msg.text}</p>}
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="bg-gray-900 text-gray-300 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <h5 className="font-bold text-white mb-3">Storo</h5>
            <p className="text-sm">Платформа для запуска интернет-магазинов быстро и просто.</p>
          </div>
          <div>
            <h5 className="font-bold text-white mb-3">Ссылки</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-white">О нас</a></li>
              <li><a href="#plans" className="hover:text-white">Тарифы</a></li>
              <li><a href="#demo" className="hover:text-white">Демо</a></li>
              <li><a href="#register" className="hover:text-white">Регистрация</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-white mb-3">Контакты</h5>
            <p className="text-sm">📧 support@storo-shop.com</p>
            <p className="text-sm">📞 +380 00 000 00 00</p>
          </div>
        </div>
        <div className="text-center text-gray-500 text-sm mt-8 border-t border-gray-700 pt-4">
          © {new Date().getFullYear()} Storo. Все права защищены.
        </div>
      </footer>
    </div>
  );
}

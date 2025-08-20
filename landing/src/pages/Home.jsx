// landing/src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

/* ——— icons ——— */
const Check = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M20 7L9 18l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Shield = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M12 3l7 4v5c0 5-3.6 8.6-7 9-3.4-.4-7-4-7-9V7l7-4z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const Zap = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M13 2L3 14h7l-1 8 11-14h-7l0-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);
const Cog = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 2a8.06 8.06 0 00-.66-1.6l1.5-1.5-2.12-2.12-1.5 1.5a8.06 8.06 0 00-1.6-.66L15 2h-3l-.56 3.12c-.55.14-1.08.34-1.6.6l-1.5-1.5L5.22 6.34l1.5 1.5c-.26.52-.46 1.05-.6 1.6L3 10.99v3l3.12.56c.14.55.34 1.08.6 1.6l-1.5 1.5 2.12 2.12 1.5-1.5c.52.26 1.05.46 1.6.6L12 22h3l.56-3.12c.55-.14 1.08-.34 1.6-.6l1.5 1.5 2.12-2.12-1.5-1.5c.26-.52.46-1.05.6-1.6L22 14v-3l-3.06-.56z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("test");

  const [company, setCompany] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const tiers = [
    { name: "Тест", tag: "14 дней", price: "0 ₴", period: "", desc: "Быстрый старт без карты", features: ["Бесплатно", "Полный функционал", "Поддержка в чате"], plan: "test", cta: "Попробовать" },
    { name: "Старт", tag: "Для малого бизнеса", price: "5 000 ₴", period: "/ год", desc: "Оптимум для начала продаж", features: ["5 000 товаров", "Базовый дизайн", "SSL, домен *.storo-shop.com", "E-mail уведомления"], plan: "start", cta: "Выбрать" },
    { name: "Медиум", tag: "Популярный", price: "9 000 ₴", period: "/ год", desc: "Растущий каталог и трафик", features: ["10 000 товаров", "Шаблоны дизайна", "Импорт/экспорт CSV", "Приёмы оплаты"], plan: "medium", highlight: true, cta: "Выбрать" },
    { name: "Про", tag: "Масштаб", price: "12 500 ₴", period: "/ год", desc: "Максимум возможностей", features: ["15 000 товаров", "Премиум-дизайн", "Резервные копии", "Приоритетная поддержка"], plan: "pro", cta: "Выбрать" },
  ];

  /* ——— helpers ——— */
  const cleanSub = (v) =>
    v.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+/, "").replace(/-+$/, "");

  const sdPreview = useMemo(() => {
    const sd = cleanSub(subdomain);
    return sd ? `${sd}.storo-shop.com` : "yourshop.storo-shop.com";
  }, [subdomain]);

  const pwdStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;
    if (score <= 2) return { label: "Слабый", level: 1 };
    if (score === 3) return { label: "Средний", level: 2 };
    return { label: "Сильный", level: 3 };
  }, [password]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);

    const sd = cleanSub(subdomain);
    if (sd.length < 3) return setMsg({ type: "error", text: "Поддомен минимум 3 символа" });
    if (!accept) return setMsg({ type: "error", text: "Нужно согласие с условиями" });

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
          plan: selectedPlan,
        }),
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

  /* ——— UI ——— */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 rounded-lg bg-indigo-600 text-white items-center justify-center font-bold">S</span>
            <span className="text-xl font-bold text-slate-900">Storo</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-slate-700">
            <a href="#about" className="hover:text-indigo-600">О нас</a>
            <a href="#features" className="hover:text-indigo-600">Возможности</a>
            <a href="#how" className="hover:text-indigo-600">Как это работает</a>
            <a href="#plans" className="hover:text-indigo-600">Тарифы</a>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="#plans" className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700">Создать магазин</a>
            <a href="https://storo-shop.com/admin" className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Войти</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="about" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(600px_300px_at_20%_10%,rgba(99,102,241,0.15),transparent),radial-gradient(700px_400px_at_80%_0%,rgba(14,165,233,0.12),transparent)]" />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs border-indigo-200 bg-white/70 mb-5">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>14 дней бесплатно · Без карты</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
            Запусти e-commerce за{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
              60 секунд
            </span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-slate-600">
            Storo — платформа, где магазин, оплата, каталог и дизайн уже готовы. Вы — добавляете товары и продаёте.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#plans" className="inline-flex justify-center px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700">
              Создать магазин бесплатно
            </a>
            <a href="#features" className="inline-flex justify-center px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50">
              Посмотреть возможности
            </a>
          </div>
          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: "60 сек", t: "до первого запуска" },
              { n: "99.9%", t: "время аптайма" },
              { n: "15 000+", t: "товаров в каталоге (Pro)" },
              { n: "24/7", t: "поддержка" },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl bg-white shadow-sm border p-5">
                <div className="text-2xl font-bold text-slate-900">{s.n}</div>
                <div className="text-slate-600 text-sm">{s.t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white border p-4 flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-600" />
            <div>
              <div className="font-semibold">Защита данных</div>
              <div className="text-sm text-slate-600">SSL, резервные копии, роли</div>
            </div>
          </div>
          <div className="rounded-xl bg-white border p-4 flex items-center gap-3">
            <Zap className="w-6 h-6 text-indigo-600" />
            <div>
              <div className="font-semibold">Высокая скорость</div>
              <div className="text-sm text-slate-600">Оптимизированные страницы</div>
            </div>
          </div>
          <div className="rounded-xl bg-white border p-4 flex items-center gap-3">
            <Cog className="w-6 h-6 text-indigo-600" />
            <div>
              <div className="font-semibold">Готовые интеграции</div>
              <div className="text-sm text-slate-600">Оплата, доставка, импорт</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-slate-900 text-center">Возможности Storo</h3>
          <p className="text-slate-600 text-center mt-2">Всё, чтобы продавать с первого дня</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Каталог и варианты", d: "Категории, фильтры, SKU, изображения, опции" },
              { t: "Заказы и оплаты", d: "Корзина, статусы, счёт, онлайн-оплата" },
              { t: "Дизайн и темы", d: "Готовые шаблоны + тонкая настройка" },
              { t: "SEO и маркетинг", d: "ЧПУ, мета-теги, карта сайта, промо-блоки" },
              { t: "Импорт/экспорт", d: "CSV/XLSX загрузка и выгрузка" },
              { t: "Команда и роли", d: "Доступы для менеджеров и контент-команды" },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border p-6 hover:shadow-lg transition bg-white">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4">
                  <Check className="w-5 h-5" />
                </div>
                <div className="font-semibold text-slate-900">{f.t}</div>
                <div className="text-slate-600 text-sm mt-1">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-slate-900 text-center">Как это работает</h3>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "1", t: "Регистрация", d: "Пара полей и поддомен" },
              { n: "2", t: "Настройка", d: "Лого, цвета, способы оплаты" },
              { n: "3", t: "Каталог", d: "Импортируйте товары или добавьте вручную" },
              { n: "4", t: "Запуск", d: "Получайте заказы и растите" },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border p-6 bg-white">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">{s.n}</div>
                <div className="mt-4 font-semibold text-slate-900">{s.t}</div>
                <div className="text-slate-600 text-sm">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-slate-900 text-center">Тарифы</h3>
          <p className="text-slate-600 text-center mt-2">Начните бесплатно, затем масштабируйтесь</p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`relative rounded-2xl border p-6 flex flex-col hover:shadow-xl transition ${
                  t.highlight ? "ring-2 ring-indigo-600" : "bg-white"
                }`}
              >
                {t.tag && (
                  <div className={`absolute -top-3 left-4 text-xs px-2 py-1 rounded-full border bg-white ${t.highlight ? "border-indigo-600 text-indigo-700" : "text-slate-700 border-slate-200"}`}>
                    {t.tag}
                  </div>
                )}
                <h4 className="text-xl font-bold text-slate-900">{t.name}</h4>
                <p className="text-slate-600 text-sm mt-1">{t.desc}</p>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-slate-900">{t.price}</span>
                  <span className="text-slate-500">{t.period}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-indigo-600"><Check className="w-4 h-4" /></span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { setSelectedPlan(t.plan); setShowModal(true); }}
                  className={`mt-6 w-full px-5 py-2 rounded-lg font-medium ${
                    t.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {t.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-slate-900 text-center">Отзывы</h3>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { a: "Олег, автозапчасти", t: "Запустились за вечер, импортировали каталог, первые заказы — на следующий день." },
              { a: "Мария, одежда", t: "Понравилось, что дизайн уже аккуратный — не тратили время на верстку." },
              { a: "Игорь, инструменты", t: "Простая админка, статус заказов и чек-аут как надо. Рекомендую." },
            ].map((q) => (
              <div key={q.a} className="rounded-2xl bg-white border p-6 shadow-sm">
                <div className="text-slate-700">“{q.t}”</div>
                <div className="mt-3 text-sm text-slate-500">{q.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-slate-900 text-center">Частые вопросы</h3>
          <div className="mt-10 max-w-3xl mx-auto divide-y border rounded-2xl bg-white">
            {[
              { q: "Правда без карты на тест?", a: "Да, 14 дней бесплатно без привязки карты. В любой момент можно перейти на платный тариф." },
              { q: "Можно свой домен?", a: "Да. По умолчанию выдаём *.storo-shop.com, позже подключите свой домен в настройках." },
              { q: "Поддержка импорта товаров?", a: "Да, CSV/XLSX импорт и экспорт доступны начиная с тарифа Медиум." },
              { q: "Как отменить?", a: "В один клик в настройках биллинга. Доступ к данным сохранится для экспорта." },
            ].map((item, i) => (
              <details key={i} className="group p-5">
                <summary className="cursor-pointer list-none flex items-center justify-between">
                  <span className="font-medium text-slate-900">{item.q}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition">⌄</span>
                </summary>
                <p className="mt-3 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-2xl font-bold">Готовы запустить магазин?</h4>
              <p className="text-white/90">Бесплатный тест на 14 дней. Без карты и скрытых условий.</p>
            </div>
            <a href="#plans" className="inline-flex px-6 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-medium">
              Начать сейчас
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-300 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <h5 className="font-bold text-white mb-3">Storo</h5>
            <p className="text-sm">Платформа для запуска интернет-магазинов быстро и просто.</p>
          </div>
          <div>
            <h5 className="font-bold text-white mb-3">Ссылки</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-white">О нас</a></li>
              <li><a href="#features" className="hover:text-white">Возможности</a></li>
              <li><a href="#plans" className="hover:text-white">Тарифы</a></li>
            </ul>
          </div>
          <div id="contacts">
            <h5 className="font-bold text-white mb-3">Контакты</h5>
            <p className="text-sm">📧 support@storo-shop.com</p>
            <p className="text-sm">📞 +380 00 000 00 00</p>
          </div>
        </div>
        <div className="text-center text-slate-500 text-sm mt-8 border-t border-slate-800 pt-4">
          © {new Date().getFullYear()} Storo. Все права защищены.
        </div>
      </footer>

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl relative overflow-hidden">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-800"
              aria-label="Закрыть"
            >
              ✖
            </button>

            <div className="p-6 border-b">
              <div className="text-xs text-slate-500">Регистрация магазина</div>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                {tiers.find((t) => t.plan === selectedPlan)?.name} — {tiers.find((t) => t.plan === selectedPlan)?.price}
                <span className="text-slate-500">{tiers.find((t) => t.plan === selectedPlan)?.period}</span>
              </h2>
            </div>

            <form onSubmit={onSubmit} className="p-6 grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-800">Компания</label>
                <input
                  className="border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ООО «Мой магазин»"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-800">Поддомен</label>
                <div className="flex items-center gap-2">
                  <input
                    className="border rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="например, demo"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    required
                  />
                  <span className="text-sm text-slate-600 shrink-0">.storo-shop.com</span>
                </div>
                <div className="text-xs text-slate-500">
                  Ваш адрес: <span className="font-medium text-slate-700">{sdPreview}</span>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-800">Email владельца</label>
                <input
                  className="border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-800">Пароль</label>
                <input
                  className="border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  type="password"
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Надёжность: {pwdStrength.label}</span>
                  <div className="flex gap-1">
                    <span className={`h-1.5 w-8 rounded ${pwdStrength.level >= 1 ? "bg-red-500" : "bg-slate-200"}`} />
                    <span className={`h-1.5 w-8 rounded ${pwdStrength.level >= 2 ? "bg-yellow-500" : "bg-slate-200"}`} />
                    <span className={`h-1.5 w-8 rounded ${pwdStrength.level >= 3 ? "bg-green-500" : "bg-slate-200"}`} />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
                Я согласен с условиями и политикой конфиденциальности
              </label>

              <button
                disabled={loading}
                className="mt-2 inline-flex justify-center items-center gap-2 bg-indigo-600 text-white rounded-xl p-3 disabled:opacity-60 hover:bg-indigo-700"
              >
                {loading ? "Создаём..." : "Создать магазин"}
              </button>

              {msg && (
                <p className={`text-sm ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>{msg.text}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

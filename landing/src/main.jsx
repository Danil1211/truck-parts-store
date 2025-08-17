import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API = import.meta.env.VITE_API_URL || "";
const TENANT_DOMAIN =
  import.meta.env.VITE_TENANT_DOMAIN?.trim() || "storo-shop.com";

const PLANS = [
  { id: "free",  title: "Free",  subtitle: "старт",   desc: "Быстрый запуск на готовой инфраструктуре.", price: "0 ₽" },
  { id: "basic", title: "Basic", subtitle: "растём",  desc: "Больше возможностей и интеграций.",        price: "1 990 ₽" },
  { id: "pro",   title: "Pro",   subtitle: "масштаб", desc: "Высокая производительность и масштаб.",    price: "4 990 ₽" },
];

function cn(...x){ return x.filter(Boolean).join(" "); }

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

function Input({ label, hint, error, right, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm text-slate-200/90">{label}</label>}
      <div
        className={cn(
          "flex items-center rounded-2xl border bg-white/5 px-3",
          error ? "border-red-400/50 ring-4 ring-red-500/20"
                : "border-white/10 focus-within:ring-4 focus-within:ring-primary/25",
          "shadow-sm transition"
        )}
      >
        <input className="input bg-transparent border-0 shadow-none px-0" {...props} />
        {right && <span className="ml-2 select-none text-sm text-slate-300/80">{right}</span>}
      </div>
      {hint && !error && <p className="text-xs text-slate-400/80">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      aria-pressed={selected}
      className={cn(
        "group relative overflow-hidden card p-5 transition",
        selected ? "ring-4 ring-primary/25 border-primary/50 shadow-glow"
                 : "hover:border-primary/40 hover:shadow-glow"
      )}
    >
      {/* Glow */}
      <div className="pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 transition">
        <div className="absolute -inset-16 blur-3xl bg-primary/20 animate-aurora" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-2.5 w-2.5 rounded-full transition",
            selected ? "bg-primary drop-shadow-brand" : "bg-slate-400/50 group-hover:bg-primary/70"
          )}/>
          <h3 className="text-base font-semibold">
            {plan.title} <span className="font-normal text-slate-300/80">— {plan.subtitle}</span>
          </h3>
        </div>
        <div className="text-sm font-semibold">{plan.price}</div>
      </div>
      <p className="mt-2 text-sm text-slate-300/90">{plan.desc}</p>
    </button>
  );
}

function Spinner({ className = "" }) {
  return (
    <svg className={cn("animate-spin h-5 w-5 text-white", className)} viewBox="0 0 24 24">
      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function Check() {
  return (
    <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function App() {
  const [company, setCompany] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan]         = useState("free");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const errors = useMemo(() => {
    const e = {};
    if (company.trim().length < 2) e.company = "Название минимум 2 символа.";
    if (!/^[a-z0-9-]{3,32}$/.test(subdomain.trim())) e.subdomain = "Только латиница/цифры/-, 3–32 символа.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Введите корректный email.";
    if (password.length < 6) e.password = "Минимум 6 символов.";
    return e;
  }, [company, subdomain, email, password]);

  const canSubmit = !loading && company && subdomain && email && password && Object.keys(errors).length === 0;

  const handleSignup = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    if (!canSubmit) { setMsg({ type: "error", text: "Проверьте форму — есть ошибки." }); return; }

    setLoading(true);
    try{
      const res = await fetch(`${API}/api/public/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), subdomain: subdomain.trim(), email: email.trim(), password, plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok){ setMsg({ type:"error", text: data?.error || "Ошибка сервера. Попробуйте позже." }); return; }

      if (data?.loginUrl) { window.location.replace(data.loginUrl); return; }
      window.location.replace(`https://${subdomain.trim()}.${TENANT_DOMAIN}/login`);
    }catch{
      setMsg({ type:"error", text:"Ошибка сети. Проверьте соединение." });
    }finally{ setLoading(false); }
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* === BACKDROP === */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-[.08]" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute top-32 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl animate-float" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[950px] h-[320px] aurora rounded-[999px] animate-aurora" />
        <div className="noise" />
      </div>

      {/* === HEADER === */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-slate-900/40 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-primary/90 shadow-glow" />
            <div className="text-lg font-bold tracking-tight">
              SteelTruck <span className="font-normal text-slate-300/90">Cloud</span>
            </div>
            <Badge>beta</Badge>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://demo.${TENANT_DOMAIN}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              demo.{TENANT_DOMAIN}
            </a>
          </div>
        </div>
      </header>

      {/* === HERO === */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-6 lg:pt-16 lg:pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-stretch">
          {/* LEFT */}
          <div className="space-y-7 animate-fadeup">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Запусти магазин за{" "}
              <span className="bg-gradient-to-r from-primary via-white to-fuchsia-400 bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
                60 секунд
              </span>
            </h1>
            <p className="text-slate-300/90 text-base">
              Создай магазин, выбери тариф, зайди в админку — и сразу наполняй каталог.
              Серверы, SSL, базы, деплой — уже готовы.
            </p>

            {/* Plans */}
            <div className="grid sm:grid-cols-3 gap-4">
              {PLANS.map((p) => (
                <PlanCard key={p.id} plan={p} selected={plan === p.id} onSelect={setPlan} />
              ))}
            </div>

            {/* Features */}
            <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-300/90">
              <li className="flex items-center gap-2"><Check/> Хостинг и SSL включены</li>
              <li className="flex items-center gap-2"><Check/> Импорт каталога (CSV/Excel)</li>
              <li className="flex items-center gap-2"><Check/> Приём платежей и доставка</li>
              <li className="flex items-center gap-2"><Check/> SEO-friendly страницы</li>
            </ul>
          </div>

          {/* RIGHT — FORM */}
          <div className="lg:pl-6 animate-fadeup">
            <form onSubmit={handleSignup} className="card p-6 shadow-xl shadow-black/30">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Начать бесплатно</h2>
                <p className="mt-1 text-sm text-slate-300/80">
                  Домен магазина: <b>*.{TENANT_DOMAIN}</b>
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Компания"
                  placeholder="ООО «СтальТрак»"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  error={errors.company}
                />
                <Input
                  label="Поддомен"
                  placeholder="например, demo"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  right={`.${TENANT_DOMAIN}`}
                  hint="3–32 символа, латиница/цифры/дефис"
                  error={errors.subdomain}
                />
                <Input
                  label="Email владельца"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                />
                <Input
                  label="Пароль"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    "btn w-full shadow-glow",
                    canSubmit ? "" : "bg-white/10 text-slate-300 cursor-not-allowed"
                  )}
                >
                  {loading ? (<><Spinner/> Создаём…</>) : <>Создать магазин</>}
                </button>

                {msg.text && (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm border",
                      msg.type === "error"
                        ? "bg-red-500/10 text-red-200 border-red-500/30"
                        : "bg-emerald-500/10 text-emerald-200 border-emerald-500/30"
                    )}
                  >
                    {msg.text}
                  </div>
                )}

                <p className="text-xs text-slate-400/80">
                  Нажимая «Создать магазин», вы соглашаетесь с условиями обслуживания и политикой конфиденциальности.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* === CTA BELT === */}
      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-slate-200/90">
            <div className="font-semibold">Готовы вырасти быстрее?</div>
            <div className="text-sm text-slate-300/80">Импортируйте товары и начните продавать сегодня.</div>
          </div>
          <a href={`https://demo.${TENANT_DOMAIN}`} target="_blank" rel="noreferrer" className="btn">
            Открыть демо
          </a>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-300/80 flex items-center justify-between">
          <span>© {new Date().getFullYear()} SteelTruck Cloud</span>
          <span className="hidden sm:block">
            API: <code className="text-slate-100/90">{API || "—"}</code>
          </span>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

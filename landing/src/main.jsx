import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API = import.meta.env.VITE_API_URL || "";
const TENANT_DOMAIN = import.meta.env.VITE_TENANT_DOMAIN?.trim() || "storo-shop.com";

const PLANS = [
  { id: "free",  title: "Free",  subtitle: "старт",   desc: "Быстрый запуск.",                 price: "0 ₽" },
  { id: "basic", title: "Basic", subtitle: "растём",  desc: "Больше возможностей роста.",      price: "1 990 ₽" },
  { id: "pro",   title: "Pro",   subtitle: "масштаб", desc: "Производительность и масштаб.",   price: "4 990 ₽" },
];

const cn = (...x) => x.filter(Boolean).join(" ");

function Badge({ children }) { return <span className="badge">{children}</span>; }

function Input({ label, hint, error, right, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm text-slate-700">{label}</label>}
      <div className={cn(
        "flex items-center rounded-xl border px-3 bg-white transition",
        error ? "border-red-400 ring-4 ring-red-200" : "border-slate-300 focus-within:ring-4 focus-within:ring-primary/20"
      )}>
        <input className="input border-0 shadow-none px-0" {...props} />
        {right && <span className="ml-2 text-sm text-slate-500 select-none">{right}</span>}
      </div>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
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
        "card p-4 text-left transition relative group",
        selected ? "ring-4 ring-primary/25 border-primary/60" : "hover:border-primary/40"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full",
            selected ? "bg-primary" : "bg-slate-300 group-hover:bg-primary/70")} />
          <h3 className="text-base font-semibold">
            {plan.title} <span className="font-normal text-slate-500">— {plan.subtitle}</span>
          </h3>
        </div>
        <div className="text-sm font-semibold">{plan.price}</div>
      </div>
      <p className="mt-2 text-sm text-slate-600">{plan.desc}</p>
    </button>
  );
}

function Check() {
  // фиксированный размер, чтобы "галочки" не раздувались
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" className="text-primary">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="animate-spin text-white">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".25"/>
      <path fill="currentColor" opacity=".9" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
}

function App() {
  const [company, setCompany] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan]         = useState("free");
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState({ type: "", text: "" });

  const errors = useMemo(() => {
    const e = {};
    if (company.trim().length < 2) e.company = "Минимум 2 символа.";
    if (!/^[a-z0-9-]{3,32}$/.test(subdomain.trim())) e.subdomain = "a-z, 0-9, -, 3–32.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Некорректный email.";
    if (password.length < 6) e.password = "Минимум 6 символов.";
    return e;
  }, [company, subdomain, email, password]);

  const canSubmit = !loading && company && subdomain && email && password && !Object.keys(errors).length;

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    if (!canSubmit) { setMsg({ type: "error", text: "Проверьте форму." }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/public/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, subdomain, email, password, plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ type:"error", text: data?.error || "Ошибка сервера." }); return; }
      if (data?.loginUrl) { window.location.replace(data.loginUrl); return; }
      window.location.replace(`https://${subdomain}.${TENANT_DOMAIN}/login`);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary" />
            <div className="text-lg font-bold">SteelTruck <span className="font-normal text-slate-500">Cloud</span></div>
            <Badge>beta</Badge>
          </div>
          <a href={`https://demo.${TENANT_DOMAIN}`} className="text-sm text-primary hover:underline" target="_blank" rel="noreferrer">
            demo.{TENANT_DOMAIN}
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight">
              Запусти интернет-магазин за <span className="text-primary">60 секунд</span>
            </h1>
            <p className="text-slate-600">
              Создай магазин, выбери тариф, зайди в админку — и сразу наполняй каталог. Серверы и SSL уже включены.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              {PLANS.map((p) => (
                <PlanCard key={p.id} plan={p} selected={plan === p.id} onSelect={setPlan} />
              ))}
            </div>

            <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check/> Хостинг и SSL включены</li>
              <li className="flex items-center gap-2"><Check/> Импорт каталога CSV/Excel</li>
              <li className="flex items-center gap-2"><Check/> Платежи и доставка</li>
              <li className="flex items-center gap-2"><Check/> SEO-дружественные страницы</li>
            </ul>
          </div>

          <div className="lg:pl-6">
            <form onSubmit={submit} className="card p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Начать бесплатно</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Домен магазина: <b>*.{TENANT_DOMAIN}</b>
                </p>
              </div>

              <div className="space-y-4">
                <Input label="Компания" placeholder="ООО «СтальТрак»" value={company} onChange={(e)=>setCompany(e.target.value)} error={errors.company} />
                <Input label="Поддомен" placeholder="например, demo" value={subdomain}
                  onChange={(e)=>setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))}
                  right={`.${TENANT_DOMAIN}`} hint="3–32 символа, латиница/цифры/дефис" error={errors.subdomain} />
                <Input label="Email владельца" type="email" placeholder="you@email.com" value={email} onChange={(e)=>setEmail(e.target.value)} error={errors.email}/>
                <Input label="Пароль" type="password" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} error={errors.password}/>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button type="submit" disabled={!canSubmit} className={cn("btn w-full", !canSubmit && "bg-slate-300 cursor-not-allowed")}>
                  {loading ? (<><Spinner/> Создаём…</>) : "Создать магазин"}
                </button>

                {msg.text && (
                  <div className={cn("rounded-xl px-4 py-3 text-sm",
                    msg.type==="error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                    {msg.text}
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Нажимая «Создать магазин», вы соглашаетесь с условиями обслуживания и политикой конфиденциальности.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} SteelTruck Cloud</span>
          <span className="hidden sm:block">API: <code className="text-slate-700">{API || "—"}</code></span>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

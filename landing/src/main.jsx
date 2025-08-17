import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API = import.meta.env.VITE_API_URL || "";
const TENANT_DOMAIN =
  import.meta.env.VITE_TENANT_DOMAIN?.trim() || "storo-shop.com";

const PLANS = [
  {
    id: "free",
    title: "Free",
    subtitle: "старт",
    desc: "Базовый набор для быстрого запуска.",
    price: "0 ₽",
  },
  {
    id: "basic",
    title: "Basic",
    subtitle: "растём",
    desc: "Расширенные возможности роста.",
    price: "1 990 ₽",
  },
  {
    id: "pro",
    title: "Pro",
    subtitle: "масштаб",
    desc: "Производительность и масштабирование.",
    price: "4 990 ₽",
  },
];

function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {children}
    </span>
  );
}

function Input({
  label,
  hint,
  error,
  right,
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <div
        className={classNames(
          "flex items-center rounded-xl border bg-white dark:bg-slate-900 px-3",
          error
            ? "border-red-400 focus-within:ring-red-300"
            : "border-slate-200 dark:border-slate-700 focus-within:ring-primary/30",
          "shadow-sm focus-within:ring-4 transition"
        )}
      >
        <input
          className="w-full bg-transparent py-3 text-[15px] text-slate-900 dark:text-slate-50 outline-none placeholder:text-slate-400"
          {...props}
        />
        {right && (
          <span className="ml-2 select-none text-sm text-slate-500">
            {right}
          </span>
        )}
      </div>
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      className={classNames(
        "group relative flex flex-col rounded-2xl border p-4 text-left transition",
        selected
          ? "border-primary ring-4 ring-primary/20"
          : "border-slate-200 dark:border-slate-700 hover:border-primary/60 hover:ring-4 hover:ring-primary/10"
      )}
      aria-pressed={selected}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={classNames(
              "h-2.5 w-2.5 rounded-full transition",
              selected ? "bg-primary" : "bg-slate-300 group-hover:bg-primary/60"
            )}
          />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {plan.title} <span className="font-normal text-slate-500">— {plan.subtitle}</span>
          </h3>
        </div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {plan.price}
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-500">{plan.desc}</p>
    </button>
  );
}

function Spinner({ className = "" }) {
  return (
    <svg
      className={classNames(
        "animate-spin h-5 w-5 text-white",
        className
      )}
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function App() {
  const [company, setCompany] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("free");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const errors = useMemo(() => {
    const e = {};
    if (company.trim().length < 2) e.company = "Название минимум 2 символа.";
    if (!/^[a-z0-9-]{3,32}$/.test(subdomain.trim()))
      e.subdomain = "Только латиница/цифры/-, 3–32 символа.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      e.email = "Введите корректный email.";
    if (password.length < 6) e.password = "Минимум 6 символов.";
    return e;
  }, [company, subdomain, email, password]);

  const canSubmit =
    !loading &&
    company &&
    subdomain &&
    email &&
    password &&
    Object.keys(errors).length === 0;

  const handleSignup = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!canSubmit) {
      setMsg({ type: "error", text: "Проверьте форму — есть ошибки." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/public/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          subdomain: subdomain.trim(),
          email: email.trim(),
          password,
          plan,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data?.error || "Ошибка сервера. Попробуйте позже.",
        });
        return;
      }

      // 1) если бэкенд вернул прямой URL — используем
      if (data?.loginUrl) {
        window.location.replace(data.loginUrl);
        return;
      }

      // 2) фолбэк — формируем URL из домена
      const url = `https://${subdomain.trim()}.${TENANT_DOMAIN}/login`;
      window.location.replace(url);
    } catch (err) {
      setMsg({ type: "error", text: "Ошибка сети. Проверьте соединение." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200/70 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/90 shadow-sm" />
            <div className="text-lg font-bold tracking-tight">
              SteelTruck <span className="font-normal text-slate-500">Cloud</span>
            </div>
            <Badge>beta</Badge>
          </div>
          <a
            href={`https://demo.${TENANT_DOMAIN}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            demo.{TENANT_DOMAIN}
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Left */}
          <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              Запусти интернет-магазин за{" "}
              <span className="text-primary">60 секунд</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-base">
              Создай магазин, выбери тариф, зайди в админку — и сразу наполняй
              каталог. Без развертывания серверов и длинных интеграций.
            </p>

            {/* Plans */}
            <div className="grid sm:grid-cols-3 gap-4">
              {PLANS.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  selected={plan === p.id}
                  onSelect={setPlan}
                />
              ))}
            </div>

            {/* Feature grid */}
            <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check /> Хостинг и SSL уже включены
              </li>
              <li className="flex items-center gap-2">
                <Check /> Импорт каталога из Excel/CSV
              </li>
              <li className="flex items-center gap-2">
                <Check /> Платежи и доставка по РФ/СНГ
              </li>
              <li className="flex items-center gap-2">
                <Check /> SEO-дружественные страницы
              </li>
            </ul>
          </div>

          {/* Form */}
          <div className="lg:pl-6">
            <form
              onSubmit={handleSignup}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur p-6 shadow-xl"
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold">
                  Начать бесплатно
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Поля обязательны. Домен магазина: <b>*.{TENANT_DOMAIN}</b>
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
                  onChange={(e) =>
                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  right={`.${TENANT_DOMAIN}`}
                  error={errors.subdomain}
                  hint="3–32 символа, латиница/цифры/дефис"
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

              {/* Submit */}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={classNames(
                    "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white shadow-lg transition",
                    canSubmit
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-slate-400 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Создаём…
                    </>
                  ) : (
                    <>Создать магазин</>
                  )}
                </button>

                {msg.text && (
                  <div
                    className={classNames(
                      "rounded-xl px-4 py-3 text-sm",
                      msg.type === "error"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200"
                        : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200"
                    )}
                  >
                    {msg.text}
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Нажимая «Создать магазин», вы соглашаетесь с условиями
                  обслуживания и политикой конфиденциальности.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} SteelTruck Cloud</span>
          <span className="hidden sm:block">
            API: <code className="text-slate-700 dark:text-slate-300">{API || "—"}</code>
          </span>
        </div>
      </footer>
    </div>
  );
}

function Check() {
  return (
    <svg
      className="h-5 w-5 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** базовый цвет бренда через CSS var в index.css:
 * :root { --color-primary: 59 130 246; } // tailwind rgb (пример)
 * и в tailwind.config.js расширь тему:
 * colors: { primary: 'rgb(var(--color-primary) / <alpha-value>)' }
 */

createRoot(document.getElementById("root")).render(<App />);

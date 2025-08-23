// landing/src/pages/TrialStart.jsx
import React, { useState } from "react";
import { useLang } from "../context/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { Link } from "react-router-dom";

const API =
  (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "") ||
  "https://api.storo-shop.com";

export default function TrialStart() {
  const { t } = useLang();
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
        body: JSON.stringify({ email, company, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("trial.error"));

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

      setOk(t("trial.success"));
    } catch (e) {
      setErr(e.message || t("trial.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 rounded-lg bg-indigo-600 text-white items-center justify-center font-bold text-lg">
              S
            </span>
            <span className="text-2xl font-extrabold text-slate-900">Storo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
            >
              {t("nav.about")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1">
        <div className="max-w-xl mx-auto px-6 py-12 bg-white rounded-xl shadow-lg mt-10">
          <h1 className="text-3xl font-bold text-center text-slate-900">
            {t("trial.title")}
          </h1>
          <p className="mt-2 text-center text-slate-600">
            {t("trial.subtitle")}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              placeholder={t("trial.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="text"
              placeholder={t("trial.company")}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="tel"
              placeholder={t("trial.phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {err && <div className="text-red-600">{err}</div>}
            {ok && <div className="text-green-600">{ok}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading && (
                <svg
                  className="w-5 h-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              )}
              {loading ? t("trial.loading") : t("trial.btn")}
            </button>
          </form>
        </div>

        {/* Roadmap section */}
        <div className="max-w-5xl mx-auto mt-16 px-6">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
            {t("trial.roadmapTitle")}
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-xl shadow text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-lg">
                1
              </span>
              <h3 className="mt-4 font-semibold text-lg">{t("trial.step1")}</h3>
              <p className="text-slate-600 mt-2">{t("trial.step1desc")}</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-lg">
                2
              </span>
              <h3 className="mt-4 font-semibold text-lg">{t("trial.step2")}</h3>
              <p className="text-slate-600 mt-2">{t("trial.step2desc")}</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-lg">
                3
              </span>
              <h3 className="mt-4 font-semibold text-lg">{t("trial.step3")}</h3>
              <p className="text-slate-600 mt-2">{t("trial.step3desc")}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-10 mt-16">
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-3 gap-8">
          <div>
            <h4 className="font-bold text-white">Storo</h4>
            <p className="mt-2 text-sm">{t("footer.company")}</p>
          </div>
          <div>
            <h4 className="font-bold text-white">{t("nav.about")}</h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li><Link to="/">{t("nav.about")}</Link></li>
              <li><a href="#features">{t("nav.features")}</a></li>
              <li><a href="#how">{t("nav.how")}</a></li>
              <li><a href="#faq">{t("nav.faq")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white">{t("footer.contacts")}</h4>
            <p className="mt-2 text-sm">support@storo-shop.com</p>
            <p className="text-sm">+380 (99) 123-45-67</p>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Storo. {t("footer.rights")}
        </div>
      </footer>
    </div>
  );
}

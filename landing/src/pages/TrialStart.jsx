import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-100">
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
            <a
              href="/"
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
            >
              {t("nav.about")}
            </a>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Form Section */}
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white shadow-lg rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {t("trial.title")}
          </h1>
          <p className="text-slate-600 mb-6">{t("trial.subtitle")}</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              placeholder={t("trial.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder={t("trial.company")}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="tel"
              placeholder={t("trial.phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {err && <div className="text-red-600">{err}</div>}
            {ok && <div className="text-green-600">{ok}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
            >
              {loading ? t("trial.loading") : t("trial.btn")}
            </button>
          </form>
        </div>
      </main>

      {/* Extra Info */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 grid sm:grid-cols-3 gap-8 text-center">
          {[
            t("trial.benefit1"),
            t("trial.benefit2"),
            t("trial.benefit3"),
          ].map((text, i) => (
            <div key={i} className="p-6 rounded-xl shadow hover:shadow-lg bg-slate-50">
              <p className="text-lg font-medium text-slate-700">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-3 gap-8">
          <div>
            <h4 className="font-bold text-white">Storo</h4>
            <p className="mt-2 text-sm">{t("footer.company")}</p>
          </div>
          <div>
            <h4 className="font-bold text-white">{t("footer.contacts")}</h4>
            <p className="mt-2 text-sm">support@storo-shop.com</p>
            <p className="text-sm">+380 (99) 123-45-67</p>
          </div>
          <div>
            <h4 className="font-bold text-white">Links</h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-white">Terms</Link></li>
              <li><a href="/" className="hover:text-white">Home</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Storo. {t("footer.rights")}
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";

export default function Home() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: "ua", label: "Українська", flag: "🇺🇦" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ];

  // закрытие dropdown при клике вне
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

          {/* Навигация */}
          <nav className="hidden md:flex items-center gap-8 text-slate-700 font-medium">
            <a href="#about" className="hover:text-indigo-600">{t("nav.about")}</a>
            <a href="#features" className="hover:text-indigo-600">{t("nav.features")}</a>
            <a href="#how" className="hover:text-indigo-600">{t("nav.how")}</a>
            <a href="#faq" className="hover:text-indigo-600">{t("nav.faq")}</a>
          </nav>

          <div className="flex items-center gap-3 relative">
            <Link
              to="/trial/start"
              className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
            >
              {t("hero.btnCreate")}
            </Link>
            <a
              href="/admin"
              className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              {t("login")}
            </a>

            {/* Dropdown языков */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen(!open)}
                className="ml-3 flex items-center gap-2 px-3 py-2 border rounded-lg bg-white shadow-sm hover:bg-slate-50"
              >
                <span>{languages.find((l) => l.code === lang)?.flag}</span>
                <span className="hidden sm:inline">{languages.find((l) => l.code === lang)?.label}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border py-1 z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code);
                        setOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-slate-100 ${
                        lang === l.code ? "font-semibold text-indigo-600" : "text-slate-700"
                      }`}
                    >
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-sky-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">{t("hero.title")}</h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-indigo-100">{t("hero.desc")}</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/trial/start"
              className="inline-flex justify-center px-8 py-4 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:bg-slate-100 text-lg"
            >
              {t("hero.btnCreate")}
            </Link>
            <a
              href="#features"
              className="inline-flex justify-center px-8 py-4 rounded-xl border border-white/70 bg-transparent hover:bg-white/10 font-semibold text-lg"
            >
              {t("hero.btnMore")}
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">{t("about.title")}</h2>
          <p className="mt-4 text-slate-600 text-lg max-w-3xl mx-auto">{t("about.text")}</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">{t("features")}</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {t("featuresList").map((f, i) => (
              <div key={i} className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
                <h3 className="text-xl font-semibold text-indigo-600">{f.title}</h3>
                <p className="mt-2 text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">{t("how")}</h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-8">
            {t("steps").map((s, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-xl shadow text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xl">
                  {i + 1}
                </span>
                <p className="mt-4 text-slate-700">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">{t("faq")}</h2>
          <div className="mt-10 space-y-6">
            {t("faqList").map((f, i) => (
              <div key={i}>
                <h3 className="font-semibold text-slate-800">{f.q}</h3>
                <p className="text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
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
            <h4 className="font-bold text-white">{t("nav.about")}</h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li><a href="#about" className="hover:text-white">{t("nav.about")}</a></li>
              <li><a href="#features" className="hover:text-white">{t("nav.features")}</a></li>
              <li><a href="#how" className="hover:text-white">{t("nav.how")}</a></li>
              <li><a href="#faq" className="hover:text-white">{t("nav.faq")}</a></li>
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

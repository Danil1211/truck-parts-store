import React, { useState } from "react";
import { Link } from "react-router-dom";
import translations from "../i18n";

export default function Home() {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "ru");
  const t = translations[lang];

  const switchLang = (l) => {
    localStorage.setItem("lang", l);
    setLang(l);
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
          <nav className="hidden md:flex items-center gap-8 text-slate-700 font-medium">
            <a href="#about" className="hover:text-indigo-600">{t.nav.about}</a>
            <a href="#features" className="hover:text-indigo-600">{t.nav.features}</a>
            <a href="#how" className="hover:text-indigo-600">{t.nav.how}</a>
            <a href="#faq" className="hover:text-indigo-600">{t.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-4">
            <select
              value={lang}
              onChange={(e) => switchLang(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="ua">UA</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
            <Link
              to="/trial/start"
              className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
            >
              {t.hero.btnCreate}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-sky-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            {t.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-indigo-100">
            {t.hero.desc}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/trial/start"
              className="inline-flex justify-center px-8 py-4 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:bg-slate-100 text-lg"
            >
              {t.hero.btnCreate}
            </Link>
            <a
              href="#features"
              className="inline-flex justify-center px-8 py-4 rounded-xl border border-white/70 bg-transparent hover:bg-white/10 font-semibold text-lg"
            >
              {t.hero.btnMore}
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">{t.about.title}</h2>
          <p className="mt-4 text-slate-600 text-lg max-w-3xl mx-auto">
            {t.about.text}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-3 gap-8">
          <div>
            <h4 className="font-bold text-white">Storo</h4>
            <p className="mt-2 text-sm">{t.footer.company}</p>
          </div>
          <div>
            <h4 className="font-bold text-white">{t.footer.contacts}</h4>
            <p className="mt-2 text-sm">support@storo-shop.com</p>
            <p className="text-sm">+380 (99) 123-45-67</p>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Storo. {t.footer.rights}
        </div>
      </footer>
    </div>
  );
}

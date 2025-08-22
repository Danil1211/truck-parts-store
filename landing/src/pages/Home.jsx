// landing/src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
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
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/trial/start" className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700">
              Создать магазин
            </Link>
            <a href="/admin" className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              Войти
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="about" className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
            Запусти e-commerce за{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">60 секунд</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-slate-600">
            Storo — платформа, где магазин, оплата, каталог и дизайн уже готовы. Вы — добавляете товары и продаёте.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/trial/start"
              className="inline-flex justify-center px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
            >
              Создать магазин бесплатно
            </Link>
            <a
              href="#features"
              className="inline-flex justify-center px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50"
            >
              Посмотреть возможности
            </a>
          </div>
        </div>
      </section>

      {/* Остальные секции без изменений */}
    </div>
  );
}

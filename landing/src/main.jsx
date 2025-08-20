// src/App.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import "./index.css";

function App() {
  const plans = [
    {
      title: "Тест",
      desc: "Доступен в течение 14 дней",
      features: ["Бесплатно"],
      price: "0 грн",
    },
    {
      title: "Старт",
      desc: "На 30 дней или на год",
      features: ["5.000 товаров", "Базовый дизайн"],
      price: "5.000 грн / год",
    },
    {
      title: "Медиум",
      desc: "На 30 дней или на год",
      features: ["10.000 товаров", "Дизайн на выбор"],
      price: "9.000 грн / год",
    },
    {
      title: "Про",
      desc: "На 30 дней или на год",
      features: ["15.000 товаров", "Премиум-дизайн"],
      price: "12.500 грн / год",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* === HEADER === */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-bold text-indigo-600">Storo</h1>
          <nav className="flex gap-6 text-gray-700 font-medium">
            <a href="#about" className="hover:text-indigo-600">О нас</a>
            <a href="#plans" className="hover:text-indigo-600">Тарифы</a>
            <a href="#contacts" className="hover:text-indigo-600">Контакты</a>
            <a href="#login" className="hover:text-indigo-600">Личный кабинет</a>
          </nav>
        </div>
      </header>

      {/* === HERO === */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <motion.h2
          className="text-4xl sm:text-5xl font-bold text-indigo-700 mb-4"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Запусти интернет-магазин за 60 секунд
        </motion.h2>
        <motion.p
          className="text-lg text-gray-600 max-w-2xl mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          Storo — простая и современная платформа для старта твоего бизнеса.
        </motion.p>
        <motion.a
          href="#plans"
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition"
          whileHover={{ scale: 1.05 }}
        >
          Выбрать тариф
        </motion.a>
      </section>

      {/* === PLANS === */}
      <section id="plans" className="py-20 px-6 bg-white">
        <h3 className="text-3xl font-bold text-center text-indigo-600 mb-12">
          Наши пакеты
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-xl transition cursor-pointer"
              whileHover={{ y: -8 }}
            >
              <h4 className="text-xl font-bold text-indigo-700 mb-2">{plan.title}</h4>
              <p className="text-gray-500 mb-4">{plan.desc}</p>
              <ul className="text-gray-700 mb-6 space-y-2">
                {plan.features.map((f, idx) => (
                  <li key={idx}>✔ {f}</li>
                ))}
              </ul>
              <p className="text-2xl font-bold text-indigo-600 mb-4">{plan.price}</p>
              <button className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition">
                Выбрать тариф
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === FOOTER === */}
      <footer id="contacts" className="bg-gray-900 text-gray-300 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <h5 className="font-bold text-white mb-3">Storo</h5>
            <p className="text-sm">
              Платформа для запуска интернет-магазинов быстро и просто.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-white mb-3">Полезные ссылки</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-white">О нас</a></li>
              <li><a href="#plans" className="hover:text-white">Тарифы</a></li>
              <li><a href="#contacts" className="hover:text-white">Контакты</a></li>
              <li><a href="#login" className="hover:text-white">Личный кабинет</a></li>
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

createRoot(document.getElementById("root")).render(<App />);

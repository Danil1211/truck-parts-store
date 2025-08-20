// landing/src/pages/Home.jsx
export default function Home() {
  const tiers = [
    { name: "Тест", price: "0 ₴", desc: "Доступен 14 дней", features: ["Бесплатно"], plan: "test" },
    { name: "Старт", price: "5 000 ₴ / год", desc: "30 дней или на год", features: ["5.000 товаров", "Базовый дизайн"], plan: "start" },
    { name: "Медиум", price: "9 000 ₴ / год", desc: "30 дней или на год", features: ["10.000 товаров", "Дизайн на выбор"], plan: "medium" },
    { name: "Про", price: "12 500 ₴ / год", desc: "30 дней или на год", features: ["15.000 товаров", "Премиум-дизайн"], plan: "pro" },
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
            <a href="#login" className="hover:text-indigo-600">Личный кабинет</a>
          </nav>
        </div>
      </header>

      {/* === HERO === */}
      <section id="about" className="text-center py-20 px-6">
        <h2 className="text-4xl sm:text-5xl font-bold text-indigo-700 mb-4">
          Запусти интернет-магазин за 60 секунд
        </h2>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          Storo — платформа для запуска магазина без программиста.
        </p>
        <a href="/register" className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition">
          Создать магазин бесплатно
        </a>
      </section>

      {/* === PLANS === */}
      <section id="plans" className="py-20 px-6 bg-white">
        <h3 className="text-3xl font-bold text-center text-indigo-600 mb-12">Наши пакеты</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {tiers.map(t => (
            <div key={t.name} className="bg-white rounded-2xl shadow-lg border p-6 flex flex-col text-center hover:shadow-xl transition">
              <h4 className="text-xl font-bold text-indigo-700 mb-2">{t.name}</h4>
              <p className="text-gray-500 mb-2">{t.desc}</p>
              <p className="text-2xl font-bold text-indigo-600 mb-4">{t.price}</p>
              <ul className="text-gray-700 mb-6 space-y-1 text-sm text-left">
                {t.features.map(f => <li key={f}>✔ {f}</li>)}
              </ul>
              <a
                href="/register"
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Выбрать тариф
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="bg-gray-900 text-gray-300 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <h5 className="font-bold text-white mb-3">Storo</h5>
            <p className="text-sm">Платформа для запуска интернет-магазинов быстро и просто.</p>
          </div>
          <div>
            <h5 className="font-bold text-white mb-3">Ссылки</h5>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-white">О нас</a></li>
              <li><a href="#plans" className="hover:text-white">Тарифы</a></li>
              <li><a href="/register" className="hover:text-white">Регистрация</a></li>
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

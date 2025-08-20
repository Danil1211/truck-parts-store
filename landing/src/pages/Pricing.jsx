// landing/src/pages/Pricing.jsx

const tiers = [
  {
    name: "Тест",
    price: "0 ₴",
    desc: "Доступен в течение 14 дней",
    features: ["Бесплатно"],
    plan: "test"
  },
  {
    name: "Старт",
    price: "5 000 ₴ / год",
    desc: "Доступен на 30 дней или на год",
    features: ["5.000 товаров", "Базовый дизайн"],
    plan: "start"
  },
  {
    name: "Медиум",
    price: "9 000 ₴ / год",
    desc: "Доступен на 30 дней или на год",
    features: ["10.000 товаров", "Дизайн на выбор"],
    plan: "medium"
  },
  {
    name: "Про",
    price: "12 500 ₴ / год",
    desc: "Доступен на 30 дней или на год",
    features: ["15.000 товаров", "Премиум-дизайн"],
    plan: "pro"
  },
];

export default function Pricing() {
  return (
    <section className="grid md:grid-cols-4 gap-6">
      {tiers.map(t => (
        <div
          key={t.name}
          className="rounded-2xl border bg-white p-6 shadow-md hover:shadow-xl transition"
        >
          <h3 className="text-xl font-bold text-indigo-700 mb-1">{t.name}</h3>
          <p className="text-sm text-gray-500 mb-2">{t.desc}</p>
          <p className="text-2xl font-bold text-indigo-600 mb-4">{t.price}</p>
          <ul className="mb-6 list-disc pl-5 text-slate-700 space-y-1 text-sm">
            {t.features.map(f => <li key={f}>{f}</li>)}
          </ul>
          <a
            href="/register"
            className="inline-block w-full text-center bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition"
          >
            Выбрать тариф
          </a>
        </div>
      ))}
    </section>
  );
}

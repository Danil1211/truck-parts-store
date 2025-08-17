const tiers = [
  { name: "Free",  price: "0 ₴/мес",   features: ["100 товаров", "Блог", "Базовые темы"], plan: "free"  },
  { name: "Basic", price: "299 ₴/мес", features: ["2000 товаров", "Импорт/экспорт", "Купоны"], plan: "basic" },
  { name: "Pro",   price: "599 ₴/мес", features: ["20000 товаров", "Мультиязык", "API"], plan: "pro"   },
];

export default function Pricing() {
  return (
    <section className="grid md:grid-cols-3 gap-6">
      {tiers.map(t => (
        <div key={t.name} className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-1">{t.name}</h3>
          <p className="text-2xl mb-4">{t.price}</p>
          <ul className="mb-4 list-disc pl-5 text-slate-700">
            {t.features.map(f => <li key={f}>{f}</li>)}
          </ul>
          <a href="/register" className="inline-block bg-blue-700 text-white rounded px-4 py-2">Купить / Начать</a>
        </div>
      ))}
    </section>
  );
}

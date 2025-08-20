export default function Home() {
  return (
    <section>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-3">Shopik — запусти магазин за 60 секунд</h1>
        <p className="text-lg text-slate-600">Без кода. Готовые темы, корзина, оплата, доставка.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <a href="/register" className="bg-blue-700 text-white px-5 py-3 rounded">Начать бесплатно</a>
          <a href="/demo" className="px-5 py-3 rounded border border-blue-700 text-blue-700">Смотреть демо</a>
        </div>
        <p className="mt-4">
          Демо: <a className="text-blue-700 underline" href="https://demo.storo-shop.com" target="_blank">demo.storo-shop.com</a>
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          ["Каталог и карточки", "Импорт/экспорт товаров, группы, характеристики."],
          ["Заказы и клиенты", "Чат, статусы, уведомления на почту."],
          ["Оформление", "Редактор тем, логотип, цвета, меню, баннеры."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl p-5 bg-white shadow-sm border">
            <h3 className="font-semibold mb-2">{t}</h3>
            <p className="text-slate-600">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

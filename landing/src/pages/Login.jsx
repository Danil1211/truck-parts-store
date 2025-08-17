export default function Login() {
  return (
    <section className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-3">Вход в админку</h2>
      <p className="text-slate-700">
        Откройте админку вашего магазина по адресу: <code>https://&lt;subdomain&gt;.shopik.com/admin</code>
      </p>
      <p className="mt-2">
        Или <a className="text-blue-700 underline" href="/register">создайте</a> новый магазин.
      </p>
    </section>
  );
}

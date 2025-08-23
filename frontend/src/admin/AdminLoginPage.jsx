// src/admin/AdminLoginPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [autoTried, setAutoTried] = useState(false);

  // ⛳ 1) Автовход по ?token=&tid= (из лендинга)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const tid = params.get("tid");

    if (!autoTried && token) {
      setAutoTried(true);

      // сохраняем токен/tenantId и идём в админку
      login(token, { tenantId: tid || undefined });

      // чистим URL и шлём на раздел (или на то, откуда пришли)
      const to =
        (location.state && location.state.from?.pathname) || "/admin/orders";

      // удаляем токен из строки запроса
      params.delete("token");
      params.delete("tid");

      navigate(
        { pathname: to, search: params.toString() ? `?${params}` : "" },
        { replace: true }
      );
    }
  }, [location.search, location.state, login, navigate, autoTried]);

  // ⛳ 2) Ручной вход email/пароль (на случай повторного логина)
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Ошибка входа");
        return;
      }

      // кладём токен
      login(data.token);

      // только админы/владельцы
      const u = data.user || {};
      const isAdmin =
        u.role === "owner" || u.role === "admin" || u.isAdmin === true;
      if (!isAdmin) {
        setErr("Используйте обычный вход на сайте.");
        return;
      }

      const to =
        (location.state && location.state.from?.pathname) || "/admin/orders";
      navigate(to, { replace: true });
    } catch {
      setErr("Ошибка сети");
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: 360,
          padding: 24,
          borderRadius: 12,
          background: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,.06)",
        }}
      >
        <h2 style={{ marginBottom: 16, textAlign: "center" }}>
          Вход в админ-панель
        </h2>

        <input
          type="email"
          placeholder="Email администратора"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{
            width: "100%",
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{
            width: "100%",
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />

        {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: 0,
            background: "#4f46e5",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Войти
        </button>
      </form>
    </div>
  );
}

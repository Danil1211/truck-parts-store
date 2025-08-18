import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export default function AdminLoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Ошибка входа");
        return;
      }
      // сохраняем токен и идём в админку
      localStorage.setItem("token", data.token);
      nav("/admin", { replace: true });
    } catch {
      setErr("Ошибка сети");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 440, margin: "60px auto" }}>
      <h2>Вход в админку</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input placeholder="Пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {err && <div style={{color:"crimson"}}>{err}</div>}
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

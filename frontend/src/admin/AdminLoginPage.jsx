import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "";

export default function AdminLoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e){
    e.preventDefault();
    setErr("");
    try{
      const res = await fetch(`${API}/api/auth/login`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(!res.ok){
        setErr(data?.error || "Ошибка входа");
        return;
      }
      // сервер в токене/юзере отдаёт role
      const role = data?.user?.role;
      const isAdmin = data?.user?.isAdmin;
      if(!(role==="owner" || role==="admin" || isAdmin)){
        setErr("Это админ-вход. Пожалуйста, используйте клиентский вход.");
        return;
      }
      login(data.token);
      nav("/admin/orders", { replace:true });
    }catch{
      setErr("Ошибка сети");
    }
  }

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-6">Вход в админ-панель</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input" type="email" placeholder="Email"
               value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input className="input" type="password" placeholder="Пароль"
               value={password} onChange={e=>setPassword(e.target.value)} required/>
        {err && <div className="text-red-500">{err}</div>}
        <button className="btn btn-primary w-full" type="submit">Войти</button>
      </form>
    </div>
  );
}

// src/pages/LoginRegisterPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import NavMenu from "../components/NavMenu";
import SideMenu from "../components/SideMenu";
import Footer from "../components/Footer";
import "../assets/LoginRegisterPage.css";

// API и определение сабдомена магазина (для X-Tenant-Id — на всякий случай)
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const SUBDOMAIN = location.hostname.endsWith(".storo-shop.com")
  ? location.hostname.split(".")[0]
  : "";

export default function LoginRegisterPage() {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();

  const [activeTab, setActiveTab] = useState("login");

  // login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // register form
  const [regForm, setRegForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [regError, setRegError] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  // --- покупательский вход
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch(`${API_URL}/api/customers/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SUBDOMAIN ? { "X-Tenant-Id": SUBDOMAIN } : {}),
        },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Ошибка входа");
        return;
      }
      login(data.token);
      navigate("/", { replace: true });
    } catch {
      setLoginError("Ошибка сервера");
    }
  };

  // --- покупательская регистрация
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    try {
      const res = await fetch(`${API_URL}/api/customers/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SUBDOMAIN ? { "X-Tenant-Id": SUBDOMAIN } : {}),
        },
        body: JSON.stringify({
          email: regForm.email,
          password: regForm.password,
          name: `${regForm.firstName} ${regForm.lastName}`.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Ошибка регистрации");
        return;
      }
      register(data.token);
      navigate("/", { replace: true });
    } catch {
      setRegError("Ошибка сервера");
    }
  };

  return (
    <>
      <div className="main-container">
        <Header />
        <NavMenu />
        <div className="loginreg-wrap">
          <div style={{ minWidth: 210 }}>
            <SideMenu />
          </div>
          <div className="loginreg-flex-wrap">
            <div className="loginreg-card-root">
              <div className="loginreg-tabs">
                <button
                  className={`loginreg-tab-btn${activeTab === "login" ? " active" : ""}`}
                  onClick={() => setActiveTab("login")}
                  type="button"
                >
                  Вход
                </button>
                <button
                  className={`loginreg-tab-btn${activeTab === "register" ? " active" : ""}`}
                  onClick={() => setActiveTab("register")}
                  type="button"
                >
                  Регистрация
                </button>
              </div>

              <div className="loginreg-card">
                <div className="loginreg-content-main">
                  {activeTab === "login" && (
                    <form className="loginreg-form" onSubmit={handleLogin} autoComplete="on">
                      <div className="loginreg-title">Вход</div>
                      <input
                        type="email"
                        placeholder="Email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        autoFocus
                      />
                      <input
                        type="password"
                        placeholder="Пароль"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      {loginError && <div className="loginreg-error">{loginError}</div>}
                      <button type="submit" className="loginreg-main-btn">Войти</button>
                    </form>
                  )}

                  {activeTab === "register" && (
                    <form className="loginreg-form" onSubmit={handleRegister} autoComplete="on">
                      <div className="loginreg-title">Регистрация</div>
                      <input
                        name="firstName"
                        placeholder="Имя"
                        value={regForm.firstName}
                        onChange={(e) => setRegForm((f) => ({ ...f, firstName: e.target.value }))} required
                      />
                      <input
                        name="lastName"
                        placeholder="Фамилия"
                        value={regForm.lastName}
                        onChange={(e) => setRegForm((f) => ({ ...f, lastName: e.target.value }))} required
                      />
                      <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={regForm.email}
                        onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))} required
                      />
                      <input
                        name="phone"
                        placeholder="Телефон (необязательно)"
                        value={regForm.phone}
                        onChange={(e) => setRegForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                      <input
                        name="password"
                        type="password"
                        placeholder="Пароль"
                        value={regForm.password}
                        onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))} required
                      />
                      {regError && <div className="loginreg-error">{regError}</div>}
                      <button type="submit" className="loginreg-main-btn">Зарегистрироваться</button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            <div className="loginreg-aside">
              {/* декор, как было */}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

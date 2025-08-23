// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api"; // добавляет токен из localStorage

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // объект пользователя (и админа арендатора)
  const [role, setRole] = useState(null);   // "user" | "superadmin" (РОЛЬ "admin" отдельно не нужна)
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token");
  const getRole  = () => localStorage.getItem("role") || "user";

  const loadProfile = async (token, currentRole) => {
    if (!token) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // ВАЖНО:
      // - для арендатора (включая owner/admin) — всегда /api/users/me
      // - для супер-админки — /api/superadmin/me
      let data;
      if (currentRole === "superadmin") {
        data = await api("/api/superadmin/me");
      } else {
        data = await api("/api/users/me");
      }

      setUser(data.user || null);
      setRole(currentRole || "user");
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(getToken(), getRole());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // login: кладём токен/tenantId/role в localStorage и дергаем загрузку профиля
  const login = (token, extra = {}) => {
    if (token) localStorage.setItem("token", token);
    if (extra.tenantId) localStorage.setItem("tenantId", extra.tenantId);
    if (extra.role)     localStorage.setItem("role", extra.role); // роль сохраняем ТОЛЬКО для супер-админки
    setLoading(true);
    loadProfile(token || getToken(), extra.role || getRole());
  };

  // регистрация обычного пользователя магазина (если нужна на витрине)
  const register = async ({ name, email, phone, password }) => {
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password }),
      });
      if (data.token) {
        login(data.token, { tenantId: data.tenantId, role: "user" });
      }
      return data;
    } catch (err) {
      console.error("Ошибка регистрации:", err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        setUser,
        login,
        register,
        logout,
        loading,
        getToken,
        getRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

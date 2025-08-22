// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api"; // api сам подставляет токен из localStorage

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // сам пользователь/админ/суперадмин
  const [role, setRole] = useState(null);       // "user" | "admin" | "superadmin"
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token");
  const getRole = () => localStorage.getItem("role") || "user";

  const loadProfile = async (token, currentRole) => {
    if (!token) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      let data;
      switch (currentRole) {
        case "admin":
          data = await api("/api/admin/me");
          break;
        case "superadmin":
          data = await api("/api/superadmin/me");
          break;
        default:
          data = await api("/api/users/me");
      }
      setUser(data.user || null);
      setRole(currentRole);
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

  const login = (token, extra = {}) => {
    if (token) localStorage.setItem("token", token);
    if (extra.tenantId) localStorage.setItem("tenantId", extra.tenantId);
    if (extra.role) localStorage.setItem("role", extra.role);
    setLoading(true);
    loadProfile(token || getToken(), extra.role || getRole());
  };

  const register = async ({ name, email, phone, password }) => {
    try {
      const data = await api("/api/users/register", {
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

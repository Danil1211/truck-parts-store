// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
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
      let { data } =
        currentRole === "superadmin"
          ? await api.get("/api/superadmin/me")
          : await api.get("/api/users/me");

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
    // ✅ 1. Проверяем query ?token=...&tid=...
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const tid = params.get("tid");
    if (token && tid) {
      localStorage.setItem("token", token);
      localStorage.setItem("tenantId", tid);
      localStorage.setItem("role", "admin");
      // чистим URL, чтобы не светился token
      window.history.replaceState({}, "", window.location.pathname);
    }

    // ✅ 2. Загружаем профиль по данным из localStorage
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
      const { data } = await api.post("/api/auth/register", {
        name,
        email,
        phone,
        password,
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

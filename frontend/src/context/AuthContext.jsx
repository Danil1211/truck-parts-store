// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api"; // api должен сам подставлять Authorization из localStorage

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token");

  const loadProfile = async (token) => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api("/api/users/me");
      setUser(data.user || null);
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(getToken());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (token, extra = {}) => {
    if (token) localStorage.setItem("token", token);
    if (extra.tenantId) localStorage.setItem("tenantId", extra.tenantId);
    setLoading(true);
    loadProfile(token || getToken());
  };

  // --- исправленный метод регистрации ---
  const register = async ({ name, email, phone, password }) => {
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password }),
      });
      if (data.token) {
        login(data.token, { tenantId: data.tenantId });
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
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
        loading,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

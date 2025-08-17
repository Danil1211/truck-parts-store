import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api"; // вместо прямого fetch

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token");

  // загрузка профиля
  const loadProfile = async (token) => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api("/api/users/me"); // api сам подставит headers
      setUser(data.user || null);
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // при загрузке приложения
  useEffect(() => {
    loadProfile(getToken());
  }, []);

  // логин
  const login = (token) => {
    localStorage.setItem("token", token);
    setLoading(true);
    loadProfile(token);
  };

  // регистрация = логин
  const register = login;

  // выход
  const logout = () => {
    localStorage.removeItem("token");
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

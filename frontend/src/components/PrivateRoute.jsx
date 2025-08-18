// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Использование:
 * <PrivateRoute><ProfilePage /></PrivateRoute>
 * <PrivateRoute adminOnly><AdminLayout /></PrivateRoute>
 */
export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const next = `${location.pathname}${location.search || ""}`;

  // нет пользователя — отправляем на правильную форму логина
  if (!user) {
    const to = adminOnly
      ? `/admin/login?next=${encodeURIComponent(next)}`
      : `/login?next=${encodeURIComponent(next)}`;
    return <Navigate to={to} replace />;
  }

  // Проверка прав для админ-маршрутов
  if (adminOnly) {
    const isAdmin =
      user?.isAdmin === true ||
      user?.role === "owner" ||
      user?.role === "admin" ||
      user?.role === "manager";

    if (!isAdmin) {
      // авторизован, но не админ → в обычный логин/кабинет
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

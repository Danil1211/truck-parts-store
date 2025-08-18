// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Обёртка для приватных роутов.
 *
 * Использование:
 *   <PrivateRoute><ProfilePage /></PrivateRoute>
 *   <PrivateRoute adminOnly><AdminLayout /></PrivateRoute>
 *
 * Поведение:
 *   - если пользователь не авторизован → редирект на /login
 *   - если adminOnly=true и роль не owner/admin → редирект на /admin/login
 */
export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // пока не знаем состояние — ничего не рендерим (без мигания)
  if (loading) return null;

  // не авторизован → на клиентский логин
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // требуется доступ в админку
  if (adminOnly) {
    const canAdmin =
      user?.role === "owner" || user?.role === "admin" || user?.isAdmin === true;

    if (!canAdmin) {
      // авторизован, но нет прав администратора → на админ-логин
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }
  }

  // доступ разрешён
  return children;
}

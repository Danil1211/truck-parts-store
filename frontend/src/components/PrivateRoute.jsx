import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * <PrivateRoute><ProfilePage /></PrivateRoute>
 * <PrivateRoute adminOnly><AdminLayout /></PrivateRoute>
 */
export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    const target = adminOnly ? "/admin/login" : "/login";
    return <Navigate to={target} replace state={{ from: location }} />;
  }

  if (adminOnly) {
    const canAdmin = user.role === "owner" || user.role === "admin" || user.isAdmin;
    if (!canAdmin) {
      // если зашёл не-админ на админ-маршрут — уводим на главную
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

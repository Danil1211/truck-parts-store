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

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // теперь проверяем role или isAdmin
  if (adminOnly) {
    const canAdmin = user.role === "owner" || user.role === "admin" || user.isAdmin;
    if (!canAdmin) return <Navigate to="/" replace />;
  }

  return children;
}

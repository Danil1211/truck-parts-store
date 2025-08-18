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
    const canAdmin =
      user.role === "owner" || user.role === "admin" || user.isAdmin === true;
    if (!canAdmin) return <Navigate to="/" replace />;
  }

  return children;
}

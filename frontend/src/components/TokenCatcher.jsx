import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TokenCatcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const tid = params.get("tid") || params.get("tenantId");

    // Без tenantId смысла нет – не логинимся
    if (!token || !tid) return;

    try {
      // 1) Сохраняем в localStorage (не зависим от реализации AuthContext)
      localStorage.setItem("token", token);
      localStorage.setItem("tenantId", tid);

      // 2) Дадим знать контексту аутентификации
      login(token, { tenantId: tid, role: "admin" });
    } catch (e) {
      console.error("TokenCatcher error:", e);
    } finally {
      // Чистим URL
      params.delete("token");
      params.delete("tid");
      params.delete("tenantId");
      const search = params.toString();

      const inAdmin =
        location.pathname === "/admin" || location.pathname.startsWith("/admin/");
      navigate(
        {
          pathname: inAdmin ? "/admin/orders" : location.pathname,
          search: search ? `?${search}` : "",
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
}

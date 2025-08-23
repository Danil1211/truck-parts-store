import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Глобальный перехватчик ?token=&tid=.
 * Должен рендериться ОДИН РАЗ рядом с Router, чтобы отработать раньше гардов.
 */
export default function TokenCatcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("token");
    const tid = params.get("tid") || params.get("tenantId");

    if (!t) return;

    try {
      // сохраняем токен, tenantId и роль админа
      login(t, { tenantId: tid, role: "admin" });
    } catch (e) {
      console.error("TokenCatcher error:", e);
    } finally {
      // чистим URL от токена
      params.delete("token");
      params.delete("tid");
      params.delete("tenantId");
      const search = params.toString();

      // если мы уже в админке — ведём в заказы,
      // иначе остаёмся на месте (но без токена в адресной строке)
      const inAdmin = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
      navigate(
        {
          pathname: inAdmin ? "/admin/orders" : location.pathname,
          search: search ? `?${search}` : "",
        },
        { replace: true }
      );
    }
  // срабатывает на каждое изменение location
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
}

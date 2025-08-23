import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TokenCatcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("token");
    const tid = params.get("tid") || params.get("tenantId");

    if (!t || !tid) return; // ⚠️ без tenantId не логиним

    try {
      login(t, { tenantId: tid, role: "admin" });
    } catch (e) {
      console.error("TokenCatcher error:", e);
    } finally {
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

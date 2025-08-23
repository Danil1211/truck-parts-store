import React, { useState } from "react";
import { useLang } from "../context/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "") || "https://api.storo-shop.com";

export default function TrialStart() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    try {
      setLoading(true);
      const res = await fetch(`${API}/api/public/trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("trial.error"));

      if (data.token && data.tenantId && data.subdomain) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("tenantId", data.tenantId);
        localStorage.setItem("role", "admin");
        window.location.href = `https://${data.subdomain}.storo-shop.com/admin/orders`;
        return;
      }

      if (data.loginUrl) {
        window.location.href = data.loginUrl;
        return;
      }

      setOk(t("trial.success"));
    } catch (e) {
      setErr(e.message || t("trial.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 20 }}>
      <div className="mb-4 text-right">
        <LanguageSwitcher />
      </div>

      <h1>{t("trial.title")}</h1>
      <p>{t("trial.subtitle")}</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input type="email" placeholder={t("trial.email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="text" placeholder={t("trial.company")} value={company} onChange={(e) => setCompany(e.target.value)} required />
        <input type="tel" placeholder={t("trial.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />

        {err && <div style={{ color: "crimson" }}>{err}</div>}
        {ok && <div style={{ color: "green" }}>{ok}</div>}

        <button type="submit" disabled={loading}>
          {loading ? t("trial.loading") : t("trial.btn")}
        </button>
      </form>
    </div>
  );
}

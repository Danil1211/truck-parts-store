// frontend/src/superadmin/SuperAdminPanel.jsx
import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";
const SUPER_KEY = import.meta.env.VITE_SUPER_KEY || "super_secret";

export default function SuperAdminPanel() {
  const [tenants, setTenants] = useState([]);

  const load = async () => {
    const res = await fetch(`${API}/api/superadmin/tenants`, {
      headers: { "x-super-key": SUPER_KEY }
    });
    const data = await res.json();
    setTenants(data);
  };

  useEffect(() => { load(); }, []);

  const changePlan = async (id, plan) => {
    await fetch(`${API}/api/superadmin/tenants/${id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-super-key": SUPER_KEY },
      body: JSON.stringify({ plan })
    });
    load();
  };

  const toggleBlock = async (id, block) => {
    await fetch(`${API}/api/superadmin/tenants/${id}/${block ? "block" : "unblock"}`, {
      method: "POST",
      headers: { "x-super-key": SUPER_KEY }
    });
    load();
  };

  return (
    <div style={{ padding: 20, fontFamily: "Segoe UI" }}>
      <h2>👑 Super Admin Panel</h2>
      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Название</th>
            <th>Домен</th>
            <th>План</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map(t => (
            <tr key={t._id} style={{ background: t.isBlocked ? "#ffe6e6" : "#e6ffe6" }}>
              <td>{t.name}</td>
              <td>{t.customDomain || `${t.subdomain}.shopik.com`}</td>
              <td>{t.plan}</td>
              <td>{t.isBlocked ? "🚫 Заблокирован" : "✅ Активен"}</td>
              <td>
                <button onClick={() => changePlan(t._id, "free")}>Free</button>
                <button onClick={() => changePlan(t._id, "basic")}>Basic</button>
                <button onClick={() => changePlan(t._id, "pro")}>Pro</button>
                {" | "}
                {t.isBlocked
                  ? <button onClick={() => toggleBlock(t._id, false)}>Разблок.</button>
                  : <button onClick={() => toggleBlock(t._id, true)}>Блок.</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

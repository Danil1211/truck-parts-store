// src/admin/AdminClientsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import "../assets/AdminClientPage.css";

const CANDIDATE_PATHS = [
  "/api/users/admin",
  "/api/clients/admin",
  "/api/admin/clients",
  "/api/clients",
];

function normalizePayload(raw) {
  const clients =
    raw?.clients ?? raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  const total =
    raw?.total ??
    raw?.count ??
    raw?.pagination?.total ??
    (Array.isArray(clients) ? clients.length : 0);

  return {
    clients: Array.isArray(clients) ? clients : [],
    total: Number.isFinite(total) ? total : 0,
  };
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const pageSize = 20;
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      const params = { q, status, page: String(page), limit: String(pageSize) };

      const remembered = sessionStorage.getItem("admin_clients_endpoint");
      const paths = remembered
        ? [remembered, ...CANDIDATE_PATHS.filter((p) => p !== remembered)]
        : [...CANDIDATE_PATHS];

      let lastErr;
      for (const path of paths) {
        try {
          const { data } = await api.get(path, { params, signal: controller.signal });
          const normalized = normalizePayload(data);
          setClients(normalized.clients);
          setTotal(normalized.total);
          sessionStorage.setItem("admin_clients_endpoint", path);
          setLoading(false);
          return;
        } catch (e) {
          if (e?.response?.status === 404) continue;
          lastErr = e;
        }
      }
      setClients([]);
      setTotal(0);
      setError(lastErr?.response?.data?.error || lastErr?.message || "Ошибка");
      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, [q, status, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="clients-admin-root">
      <div className="clients-admin-header">
        <h1 className="clients-admin-title">Клиенты</h1>
      </div>

      <div className="clients-admin-filters">
        <input
          className="search-input"
          type="text"
          placeholder="Поиск (имя / email / телефон)…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <select
          className="status-select"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="all">Все</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
        </select>
      </div>

      <div className="clients-admin-table-wrap">
        <table className="clients-admin-table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="table-center">Загрузка…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="table-error">{error}</td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-center">Клиентов нет</td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr
                  key={c._id || c.id}
                  onClick={() => navigate(`/admin/clients/${c._id || c.id}`)}
                >
                  <td>
                    <span className="client-avatar">
                      {(c.firstName || c.name || "?").charAt(0)}
                    </span>
                    <span className="client-name">
                      {c.firstName && c.lastName
                        ? `${c.firstName} ${c.lastName}`
                        : c.name || "—"}
                    </span>
                  </td>
                  <td>{c.email || "—"}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="clients-pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";

import "../assets/AdminPanel.css";
import "../assets/AdminClientPage.css";

const CLIENTS_PATHS = [
  "/api/users/admin",
  "/api/admin/users",
  "/api/clients/admin",
];

const GUESTS_PATHS = [
  "/api/orders/guests",      // если у тебя есть спец. роут
  "/api/admin/orders/guests" // либо можно фильтровать обычные заказы
];

function normalizePayload(raw) {
  const items = raw?.clients ?? raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  const total =
    raw?.total ?? raw?.count ?? raw?.pagination?.total ?? (Array.isArray(items) ? items.length : 0);

  return {
    items: Array.isArray(items) ? items : [],
    total: Number.isFinite(total) ? total : 0,
  };
}

export default function AdminClientsPage() {
  const [tab, setTab] = useState("registered"); // registered | guests
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const pageSize = 20;

  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      const params = { q, page: String(page), limit: String(pageSize) };
      const paths = tab === "registered" ? CLIENTS_PATHS : GUESTS_PATHS;
      let lastErr;

      for (const path of paths) {
        try {
          const { data } = await api.get(path, { params, signal: controller.signal });
          const normalized = normalizePayload(data);
          setClients(normalized.items);
          setTotal(normalized.total);
          setLoading(false);
          return;
        } catch (e) {
          if (e?.response?.status === 404) continue;
          lastErr = e;
        }
      }
      setClients([]);
      setTotal(0);
      setError(lastErr?.response?.data?.error || lastErr?.message || "Ошибка загрузки");
      setLoading(false);
    }
    load();
    return () => controller.abort();
  }, [q, page, tab]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="clients-admin-root">
      <div className="clients-admin-header">
        <h1 className="clients-admin-title">Клиенты</h1>
      </div>

      {/* Субменю */}
      <AdminSubMenu
        type="clients"
        activeKey={tab}
        onChange={(key) => {
          setTab(key);
          setPage(1);
        }}
        items={[
          { key: "registered", label: "Зарегистрированные" },
          { key: "guests", label: "Без регистрации" },
        ]}
      />

      <div className="clients-admin-filters">
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Поиск (имя / email / телефон)…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="clients-admin-table-wrap">
        <table className="clients-admin-table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>{tab === "registered" ? "Регистрация" : "Оформил заказ"}</th>
              <th>Заказы</th>
              <th>Рейтинг</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="center-cell">Загрузка…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="error-cell">{error}</td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="center-cell">Нет данных</td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client._id || client.id}
                  className="client-row"
                  onClick={() =>
                    navigate(`/admin/clients/${client._id || client.id}`)
                  }
                >
                  <td className="client-name">
                    <span className="client-avatar">
                      {(client.firstName || client.name || "?").charAt(0)}
                    </span>
                    <span>
                      {client.firstName && client.lastName
                        ? `${client.firstName} ${client.lastName}`
                        : client.name || ""}
                    </span>
                  </td>
                  <td>{client.email || "—"}</td>
                  <td>{client.phone || "—"}</td>
                  <td>
                    {client.createdAt
                      ? new Date(client.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>{client.ordersCount ?? 0}</td>
                  <td>
                    <span className="rating-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < (client.rating ?? 0) ? "star filled" : "star"}
                        >
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="rating-num">{client.rating ?? "—"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="clients-pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Назад</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд →</button>
        </div>
      )}
    </div>
  );
}

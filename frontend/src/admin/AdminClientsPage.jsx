// src/admin/AdminClientsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Базовый URL API:
 * - сначала берём из VITE_API_URL,
 * - иначе — локальный бэк на 3000.
 * Хвостовой слэш убираем, чтобы не было // в запросах.
 */
const API_URL =
  (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).replace(/\/+$/, "")) ||
  "http://localhost:3000";

/**
 * Возможные пути для списка клиентов.
 * Порядок важен. Если 404 — пробуем следующий.
 * Первый успешно сработавший запоминаем в sessionStorage.
 */
const CANDIDATE_PATHS = [
  "/api/users/admin",      // бэк из users.js (рекомендованный)
  "/api/clients/admin",    // если у тебя есть отдельный роут clients
  "/api/admin/clients",    // альтернативный вариант
  "/api/clients"           // общий список
];

function normalizePayload(raw) {
  // Унифицируем ответ разных бэков
  const clients =
    raw?.clients ??
    raw?.items ??
    raw?.data ??
    (Array.isArray(raw) ? raw : []);
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

      const params = new URLSearchParams({
        q,
        status,
        page: String(page),
        limit: String(pageSize),
      }).toString();

      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Если уже находили рабочий путь — пробуем его первым
      const remembered = sessionStorage.getItem("admin_clients_endpoint");
      const paths = remembered
        ? [remembered, ...CANDIDATE_PATHS.filter(p => p !== remembered)]
        : [...CANDIDATE_PATHS];

      let lastErr;

      for (const path of paths) {
        const url = `${API_URL}${path}?${params}`;

        try {
          const res = await fetch(url, {
            headers,
            signal: controller.signal,
            credentials: "include",
          });

          if (res.status === 404) {
            // не тот роут — идём дальше
            continue;
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();
          const normalized = normalizePayload(data);

          setClients(normalized.clients);
          setTotal(normalized.total);
          sessionStorage.setItem("admin_clients_endpoint", path);
          setLoading(false);
          return;
        } catch (e) {
          lastErr = e;
          if (controller.signal.aborted) return; // тишина при анмаунте
        }
      }

      // Если сюда дошли — ничего не сработало
      setClients([]);
      setTotal(0);
      setError(
        `Не удалось загрузить клиентов (проверь API_URL и маршрут /api/users/admin). ${
          lastErr ? String(lastErr) : ""
        }`
      );
      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, [q, status, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="clients-admin-root">
      <div className="clients-admin-header">
        {/* ФИКСИРУЕМ цвет заголовка — не зависит от темы сайта */}
        <h1
          className="clients-admin-title"
          style={{ fontWeight: 400, fontSize: 20, margin: 0, color: "#2291ff" }}
        >
          Клиенты
        </h1>
      </div>

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

        <select
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
              <th>Имя</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  Загрузка…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} style={{ color: "#e84242", textAlign: "center" }}>
                  {error}
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  Клиентов не найдено
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client._id || client.id}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(`/admin/clients/${client._id || client.id}`)
                  }
                >
                  <td>
                    <span className="client-avatar">
                      {(client.firstName || client.name || "").charAt(0)}
                    </span>{" "}
                    {client.firstName && client.lastName
                      ? `${client.firstName} ${client.lastName}`
                      : client.name || ""}
                  </td>
                  <td>{client.email || ""}</td>
                  <td>{client.phone || ""}</td>
                  <td>
                    {client.createdAt
                      ? new Date(client.createdAt).toLocaleDateString()
                      : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="clients-pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ← Назад
          </button>
          <span style={{ lineHeight: "32px" }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}

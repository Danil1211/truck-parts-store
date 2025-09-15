import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminClientPage.css";

const BASE_URL = String(api.defaults.baseURL || "").replace(/\/+$/, "");
const CLIENT_PATHS = [
  (id) => `/api/users/admin/${id}`,
  (id) => `/api/admin/users/${id}`,
  (id) => `/api/clients/admin/${id}`,
];
const ORDERS_BY_USER_PATHS = [
  (id) => `/api/orders?user=${id}`,
  (id) => `/api/orders/admin?user=${id}`,
  (id) => `/api/admin/orders?user=${id}`,
];

const firstDefined = (...v) => v.find((x) => x != null);
const joinUrl = (base, path) =>
  path?.startsWith("http")
    ? path
    : `${base}${path?.startsWith("/") ? "" : "/"}${path || ""}`;

function normalizeClient(raw) {
  const c = firstDefined(raw?.client, raw?.user, raw) || {};
  return {
    id: c._id || c.id,
    firstName: c.firstName || c.name || "",
    lastName: c.lastName || "",
    phone: c.phone || "",
    email: c.email || "",
    createdAt: c.createdAt || null,
    rating: typeof c.rating === "number" ? c.rating : null,
  };
}
function normalizeOrders(raw) {
  const arr =
    firstDefined(raw?.orders, raw?.items, raw?.data, Array.isArray(raw) ? raw : []) || [];
  return arr.map((o) => ({
    id: o._id || o.id,
    createdAt: o.createdAt || o.date || null,
    totalPrice: Number(o.totalPrice || 0),
    items: Array.isArray(o.items) ? o.items : [],
    address: o.novaPoshta || o.address || "",
  }));
}

export default function AdminClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [opened, setOpened] = useState({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        for (const build of CLIENT_PATHS) {
          try {
            const { data } = await api.get(build(id));
            setClient(normalizeClient(data));
            setLoading(false);
            return;
          } catch (e) {
            if (e?.response?.status === 404) continue;
            throw e;
          }
        }
      } catch {
        setClient(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setOrdersLoading(true);
      try {
        for (const build of ORDERS_BY_USER_PATHS) {
          try {
            const { data } = await api.get(build(id));
            setOrders(normalizeOrders(data));
            setOrdersLoading(false);
            return;
          } catch (e) {
            if (e?.response?.status === 404) continue;
            throw e;
          }
        }
      } catch {
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="client-detail-page admin-content with-submenu">
        <AdminSubMenu type="clients" activeKey="registered" />
        <div className="client-detail-content">
          <div className="loader-standalone">
            <span className="loader" />
          </div>
        </div>
      </div>
    );
  }
  if (!client) {
    return (
      <div className="client-detail-page admin-content with-submenu">
        <AdminSubMenu type="clients" activeKey="registered" />
        <div className="client-detail-content">
          <div className="center page-pad">Клиент не найден</div>
        </div>
      </div>
    );
  }

  const toggle = (orderId) => setOpened((s) => ({ ...s, [orderId]: !s[orderId] }));

  return (
    <div className="client-detail-page admin-content with-submenu">
      <AdminSubMenu type="clients" activeKey="registered" />

      <div className="client-detail-content">
        {/* НЕ fixed topbar для детали клиента */}
        <div className="client-topbar">
          <div className="client-topbar-left">
            <button className="btn-ghost" onClick={() => navigate("/admin/clients")}>
              ← Назад
            </button>
            <div className="client-topbar-title">
              {client.firstName || client.lastName ? (
                <>
                  {client.firstName} {client.lastName}
                </>
              ) : (
                "Клиент"
              )}
            </div>
          </div>
          <div className="client-actions">
            <button className="btn-primary" onClick={() => alert("Создать заказ")}>
              Создать заказ
            </button>
            <button className="btn-danger" onClick={() => alert("Удалить клиента")}>
              Удалить клиента
            </button>
          </div>
        </div>

        {/* Карточка клиента */}
        <div className="card client-main-card">
          <div className="client-info">
            <h2>
              {client.firstName} {client.lastName}
            </h2>
            <div>
              <b>Телефон:</b> {client.phone || "—"}
            </div>
            <div>
              <b>Email:</b> {client.email || "—"}
            </div>
            <div>
              <b>Дата регистрации:</b>{" "}
              {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "—"}
            </div>
          </div>

          <div className="client-rating">
            <div className="rating-title">Рейтинг клиента</div>
            <div className="rating-row">
              <div className="rating-stars">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < (client.rating ?? 0) ? "star on" : "star"}
                    aria-hidden
                  >
                    ★
                  </span>
                ))}
              </div>
              <div className="rating-badge">
                {client.rating ?? "—"}
                <span className="rating-max">/10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Заказы */}
        <div className="card client-orders-card">
          <h3>Заказы клиента</h3>

          {ordersLoading ? (
            <div className="loader-standalone">
              <span className="loader" />
            </div>
          ) : orders.length === 0 ? (
            <div className="center muted">У клиента нет заказов</div>
          ) : (
            orders.map((o) => {
              const items = Array.isArray(o.items) ? o.items : [];
              const sum =
                o.totalPrice ||
                items.reduce(
                  (s, it) =>
                    s +
                    (Number(it.product?.price) || 0) * (Number(it.quantity) || 1),
                  0
                );
              const isOpen = opened[o.id];

              return (
                <div key={o.id} className="order-card">
                  <div className="order-header">
                    <div
                      className="order-id"
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      title={`Открыть заказ ${o.id}`}
                    >
                      № {String(o.id).slice(-6)}
                      <span className="order-date">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    <div className="order-right">
                      <div className="order-sum">{sum} ₴</div>
                      {items.length > 1 && (
                        <button className="btn-link" onClick={() => toggle(o.id)}>
                          Смотреть все ({items.length}) {isOpen ? "▲" : "▼"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="order-items">
                    {items.slice(0, isOpen ? undefined : 1).map((it, idx) => (
                      <div key={idx} className="order-item">
                        <img
                          alt="Фото"
                          src={
                            (it.product?.images?.[0] &&
                              joinUrl(BASE_URL, it.product.images[0])) ||
                            (it.product?.image && joinUrl(BASE_URL, it.product.image)) ||
                            "/images/no-image.png"
                          }
                        />
                        <div className="order-item-name">
                          {it.product?.name || "Товар"}
                        </div>
                        <div className="order-item-qty">{it.quantity} шт.</div>
                        <div className="order-item-price">
                          {(Number(it.product?.price) || 0) *
                            (Number(it.quantity) || 1)}{" "}
                          ₴
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api.js";

import "../assets/AdminPanel.css";
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

const joinUrl = (base, path) =>
  path?.startsWith("http")
    ? path
    : `${base}${path?.startsWith("/") ? "" : "/"}${path || ""}`;

const firstDefined = (...vals) => vals.find((v) => v != null);

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
    reviews: Array.isArray(c.reviews) ? c.reviews : [],
  };
}

function normalizeOrders(raw) {
  const arr =
    firstDefined(raw?.orders, raw?.items, raw?.data, Array.isArray(raw) ? raw : []) || [];
  return arr.map((o) => ({
    _id: o._id || o.id,
    createdAt: o.createdAt || o.date || null,
    totalPrice: Number(o.totalPrice || 0),
    novaPoshta: o.novaPoshta || o.address || "",
    items: Array.isArray(o.items) ? o.items : [],
    user: o.user || null,
  }));
}

export default function AdminClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [openedOrders, setOpenedOrders] = useState({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        for (const build of CLIENT_PATHS) {
          try {
            const res = await api.get(build(id));
            setClient(normalizeClient(res.data));
            setLoading(false);
            return;
          } catch (e) {
            if (e?.response?.status === 404) continue;
            throw e;
          }
        }
      } catch (e) {
        console.warn("Client load failed:", e);
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
            const res = await api.get(build(id));
            setOrders(normalizeOrders(res.data));
            setOrdersLoading(false);
            return;
          } catch (e) {
            if (e?.response?.status === 404) continue;
            throw e;
          }
        }
      } catch (e) {
        console.warn("Orders load failed:", e);
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    })();
  }, [id]);

  const toggleOrder = (orderId) => {
    setOpenedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (loading) {
    return <div className="loader-center">Загрузка клиента…</div>;
  }
  if (!client) {
    return <div className="empty-center">Клиент не найден</div>;
  }

  return (
    <div className="admin-content client-detail-page">
      {/* Топбар */}
      <div className="client-topbar">
        <button className="btn-ghost" onClick={() => navigate("/admin/clients")}>
          ← Назад
        </button>
        <div className="client-topbar-title">
          {client.firstName} {client.lastName}
        </div>
        <div className="client-actions">
          <button className="btn-primary">Создать заказ</button>
          <button className="btn-danger">Удалить клиента</button>
        </div>
      </div>

      {/* Карточка клиента */}
      <div className="card client-main-card">
        <div className="client-info">
          <h2>
            {client.firstName} {client.lastName}
          </h2>
          <p><b>Телефон:</b> {client.phone || "—"}</p>
          <p><b>Email:</b> {client.email || "—"}</p>
          <p>
            <b>Дата регистрации:</b>{" "}
            {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "—"}
          </p>
        </div>
        <div className="client-rating">
          <div className="rating-title">Рейтинг клиента</div>
          <div className="rating-score">{client.rating ?? "—"}/10</div>
          <div className="rating-stars">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className={i < (client.rating ?? 0) ? "star filled" : "star"}>
                ★
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Заказы клиента */}
      <div className="card client-orders-card">
        <h3>Заказы клиента</h3>
        {ordersLoading ? (
          <div className="loader-center">Загрузка заказов…</div>
        ) : orders.length === 0 ? (
          <div className="empty-center">У клиента нет заказов</div>
        ) : (
          orders.map((order) => {
            const items = order.items || [];
            const opened = openedOrders[order._id];
            const sum =
              order.totalPrice ||
              items.reduce(
                (s, it) =>
                  s + (Number(it.product?.price) || 0) * (Number(it.quantity) || 1),
                0
              );
            return (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div
                    className="order-id"
                    onClick={() => navigate(`/admin/orders/${order._id}`)}
                  >
                    № {order._id.slice(-6)}
                    <span className="order-date">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <div className="order-sum">{sum} ₴</div>
                  {items.length > 1 && (
                    <button
                      className="btn-link"
                      onClick={() => toggleOrder(order._id)}
                    >
                      Смотреть все ({items.length}) {opened ? "▲" : "▼"}
                    </button>
                  )}
                </div>
                <div className="order-items">
                  {items.slice(0, opened ? undefined : 1).map((it, idx) => (
                    <div key={idx} className="order-item">
                      <img
                        src={
                          (it.product?.images?.[0] &&
                            joinUrl(BASE_URL, it.product.images[0])) ||
                          (it.product?.image &&
                            joinUrl(BASE_URL, it.product.image)) ||
                          "/images/no-image.png"
                        }
                        alt="Фото"
                      />
                      <div className="order-item-name">
                        {it.product?.name || "Товар"}
                      </div>
                      <div className="order-item-qty">{it.quantity} шт.</div>
                      <div className="order-item-price">
                        {(it.product?.price || 0) * (it.quantity || 1)} ₴
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
  );
}

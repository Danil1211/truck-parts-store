// src/admin/AdminClientDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_URL = String(RAW_API).replace(/\/+$/, "");

// --- маршруты для клиента ---
const CLIENT_PATHS = [
  (id) => `/api/users/admin/${id}`,
  (id) => `/api/admin/users/${id}`,
  (id) => `/api/clients/admin/${id}`,
];

// --- маршруты для заказов клиента ---
const ORDERS_BY_USER_PATHS = [
  (id) => `/api/orders?user=${id}`,
  (id) => `/api/orders/admin?user=${id}`,
  (id) => `/api/admin/orders?user=${id}`,
];

const joinUrl = (base, path) =>
  path?.startsWith("http") ? path : `${base}${path?.startsWith("/") ? "" : "/"}${path || ""}`;

const firstDefined = (...vals) => vals.find((v) => v != null);

// --- нормализация клиента ---
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

// --- нормализация заказов ---
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
  const { getToken } = useAuth();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [openedOrders, setOpenedOrders] = useState({});

  // --- загрузка клиента с fallback ---
  useEffect(() => {
    if (!id) return;
    let aborted = false;
    (async () => {
      setLoading(true);
      const headers = {};
      const t = getToken();
      if (t) headers.Authorization = `Bearer ${t}`;

      let lastErr;
      for (const build of CLIENT_PATHS) {
        try {
          const res = await fetch(joinUrl(API_URL, build(id)), { headers });
          if (res.status === 404) continue;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!aborted) setClient(normalizeClient(data));
          setLoading(false);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!aborted) {
        setClient(null);
        setLoading(false);
        console.warn("Client load failed:", lastErr);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [id, getToken]);

  // --- загрузка заказов с fallback ---
  useEffect(() => {
    if (!id) return;
    let aborted = false;
    (async () => {
      setOrdersLoading(true);
      const headers = {};
      const t = getToken();
      if (t) headers.Authorization = `Bearer ${t}`;

      let lastErr;
      for (const build of ORDERS_BY_USER_PATHS) {
        try {
          const res = await fetch(joinUrl(API_URL, build(id)), { headers });
          if (res.status === 404) continue;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!aborted) setOrders(normalizeOrders(data));
          setOrdersLoading(false);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!aborted) {
        setOrders([]);
        setOrdersLoading(false);
        console.warn("Orders load failed:", lastErr);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [id, getToken]);

  const toggleOrder = (orderId) => {
    setOpenedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (loading) {
    return (
      <div style={{ padding: "38px 0 0 0", minHeight: 300, textAlign: "center" }}>
        Загрузка...
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ padding: "38px 0 0 0", minHeight: 300 }}>
        Клиент не найден
      </div>
    );
  }

  const productImgSize = 50;

  return (
    <div className="client-details-full-root">
      <div className="client-details-container" style={{ minWidth: 0, paddingBottom: 38 }}>
        <button className="btn-back" onClick={() => navigate("/admin/clients")}>
          <svg
            width="18"
            height="18"
            style={{ marginRight: 7, verticalAlign: "-2px" }}
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M10 3L3 10M3 10L10 17M3 10H17"
              stroke="#2291ff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Назад к клиентам
        </button>

        <div className="client-details-full-card">
          <div className="client-details-main-row">
            <div className="client-details-info-block">
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
                {client.createdAt
                  ? new Date(client.createdAt).toLocaleDateString()
                  : "—"}
              </div>
            </div>
            <div className="client-details-rating-block">
              <div className="client-rating-title">Рейтинг клиента</div>
              <div className="client-rating-score">
                <span>{client.rating ?? "—"}</span>
                <span className="client-rating-max">/ 10</span>
              </div>
              <div className="client-rating-stars">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < (client.rating ?? 0) ? "star filled" : "star"}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div className="client-reviews-block">
                <div className="client-reviews-title">Отзывы</div>
                {(!client.reviews || client.reviews.length === 0) && (
                  <div className="client-no-reviews">Нет отзывов</div>
                )}
                {client.reviews &&
                  client.reviews.map((r, idx) => (
                    <div key={idx} className="client-review-item">
                      {r.text}
                    </div>
                  ))}
                <button className="btn-leave-review">Оставить отзыв</button>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div
          style={{
            display: "flex",
            gap: "18px",
            margin: "18px 0 10px 0",
            alignItems: "center",
          }}
        >
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "40px",
              minWidth: "170px",
              fontWeight: 700,
              fontSize: "1rem",
              border: "none",
              borderRadius: "12px",
              padding: "0 20px",
              background: "#2291ff",
              color: "#fff",
              cursor: "pointer",
              gap: "8px",
              boxShadow: "0 1px 8px #2291ff11",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 5V15M5 10H15"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Создать заказ
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "40px",
              minWidth: "170px",
              fontWeight: 700,
              fontSize: "1rem",
              border: "none",
              borderRadius: "12px",
              padding: "0 20px",
              background: "#ff4747",
              color: "#fff",
              cursor: "pointer",
              gap: "8px",
              boxShadow: "0 1px 8px #ff474711",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M6 6L14 14M6 14L14 6"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Удалить клиента
          </button>
        </div>

        {/* Список заказов клиента */}
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 18 }}>
            Список заказов клиента
          </h3>
          {ordersLoading ? (
            <div style={{ color: "#7da3c4", fontSize: 17, margin: "20px 0" }}>
              Загрузка заказов…
            </div>
          ) : orders.length > 0 ? (
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Заголовок */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "90px 62px 1fr 56px 82px 1fr 1.1fr 180px",
                  gap: "12px",
                  fontWeight: 700,
                  color: "#141b23",
                  fontSize: 16,
                  padding: "0 10px",
                }}
              >
                <div>№ заказа</div>
                <div>Фото</div>
                <div>Товар</div>
                <div>Кол-во</div>
                <div>Сумма</div>
                <div>Клиент</div>
                <div>Адрес</div>
                <div></div>
              </div>

              {orders.map((order) => {
                const items = order.items || [];
                const hasMany = items.length > 1;
                const opened = openedOrders[order._id];
                const sum =
                  order.totalPrice ||
                  items.reduce(
                    (s, it) =>
                      s +
                      (Number(it.product?.price) || 0) *
                        (Number(it.quantity) || 1),
                    0
                  );
                return (
                  <div
                    key={order._id}
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      boxShadow: "0 4px 16px #0051ff0c",
                      padding: "12px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: opened && hasMany ? 8 : 0,
                      border: "1px solid #f1f4fb",
                    }}
                  >
                    {/* Первый товар */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "90px 62px 1fr 56px 82px 1fr 1.1fr 180px",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#2291ff",
                          fontSize: 16,
                          wordBreak: "break-all",
                        }}
                      >
                        №{" "}
                        <span
                          style={{
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            navigate(`/admin/orders/${order._id}`)
                          }
                        >
                          {order._id.slice(-6)}
                        </span>
                        <div
                          style={{
                            color: "#888",
                            fontWeight: 400,
                            fontSize: 13,
                            marginTop: 2,
                          }}
                        >
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <img
                          src={
                            (items[0]?.product?.images?.[0] &&
                              joinUrl(API_URL, items[0].product.images[0])) ||
                            (items[0]?.product?.image &&
                              joinUrl(API_URL, items[0].product.image)) ||
                            "/images/no-image.png"
                          }
                          alt="Фото"
                          style={{
                            width: productImgSize,
                            height: productImgSize,
                            borderRadius: 10,
                            objectFit: "cover",
                            border: "1px solid #e7f0fb",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 15 }}>
                        {items[0]?.product?.name || "Товар"}
                      </div>
                      <div>{items[0]?.quantity} шт.</div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#141b23",
                          fontSize: 16,
                        }}
                      >
                        {sum} ₴
                      </div>
                      <div>
                        <span style={{ fontWeight: 600 }}>
                          {client.firstName} {client.lastName}
                        </span>
                        <div style={{ color: "#888", fontSize: 14 }}>
                          {client.phone}
                        </div>
                      </div>
                      <div style={{ fontSize: 14 }}>
                        {order.city ||
                          items[0]?.address ||
                          items[0]?.deliveryAddress ||
                          order.novaPoshta ||
                          "—"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          justifyContent: "flex-start",
                          alignItems: "center",
                          marginLeft: "-45px",
                        }}
                      >
                        {hasMany && (
                          <button
                            onClick={() => toggleOrder(order._id)}
                            style={{
                              color: "#2291ff",
                              background: "#eaf4ff",
                              border: "none",
                              borderRadius: 10,
                              padding: "7px 15px",
                              fontWeight: 500,
                              fontSize: 13,
                              minWidth: 150,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Смотреть все ({items.length} товаров){" "}
                            {opened ? "▲" : "▼"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Остальные товары */}
                    {hasMany &&
                      opened &&
                      items.slice(1).map((item, idx) => (
                        <div
                          key={item._id || idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "90px 62px 1fr 56px 82px 1fr 1.1fr 180px",
                            gap: "12px",
                            alignItems: "center",
                            borderTop: "1px solid #eaf4ff",
                            paddingTop: 8,
                            marginTop: 5,
                          }}
                        >
                          <div style={{ fontWeight: 500, color: "#888" }}>
                            + товар
                          </div>
                          <div>
                            <img
                              src={
                                (item.product?.images?.[0] &&
                                  joinUrl(API_URL, item.product.images[0])) ||
                                (item.product?.image &&
                                  joinUrl(API_URL, item.product.image)) ||
                                "/images/no-image.png"
                              }
                              alt="Фото"
                              style={{
                                width: productImgSize,
                                height: productImgSize,
                                borderRadius: 10,
                                objectFit: "cover",
                                border: "1px solid #e7f0fb",
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 15 }}>
                            {item.product?.name || "Товар"}
                          </div>
                          <div>{item.quantity} шт.</div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "#141b23",
                              fontSize: 16,
                            }}
                          >
                            {(item.product?.price || 0) *
                              (item.quantity || 1)}{" "}
                            ₴
                          </div>
                          <div>
                            <span style={{ fontWeight: 600 }}>
                              {client.firstName} {client.lastName}
                            </span>
                            <div style={{ color: "#888", fontSize: 14 }}>
                              {client.phone}
                            </div>
                          </div>
                          <div style={{ fontSize: 14 }}>
                            {order.city ||
                              item.address ||
                              item.deliveryAddress ||
                              order.novaPoshta ||
                              "—"}
                          </div>
                          <div></div>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "#888", fontSize: 16, marginTop: 8 }}>
              У клиента нет заказов
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

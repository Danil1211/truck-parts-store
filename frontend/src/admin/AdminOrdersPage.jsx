import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminSubMenu from "./AdminSubMenu";
import api from "../utils/api.js";

const ORDER_STATUSES = [
  { key: "new",        label: "Новый" },
  { key: "processing", label: "В обработке" },
  { key: "done",       label: "Выполнен" },
  { key: "cancelled",  label: "Отменённый" },
];

const STATUS_COLORS = {
  new:        { border: "#75f5cc", text: "#1dcc97", bg: "#eafff8" },
  processing: { border: "#ffd482", text: "#f49c22", bg: "#fffaf3" },
  done:       { border: "#cfd5db", text: "#757e88", bg: "#f8f9fa" },
  cancelled:  { border: "#ffc3c3", text: "#e12a2a", bg: "#fff3f3" },
};

const PAGE_LIMITS = [20, 50, 100];
const cancelReasonsList = [
  "Нет в наличии",
  "Оплата не поступила",
  "По просьбе покупателя",
  "Заказ дубликат",
  "Не получилось дозвониться",
];

const BASE_URL = (api.defaults.baseURL || "").replace(/\/+$/, "");

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLORS[status] || STATUS_COLORS["new"];

  return (
    <div className="status-dd">
      <button
        onClick={() => setOpen((v) => !v)}
        className="status-dd-btn"
        style={{
          background: color.bg,
          color: color.text,
          borderColor: color.border,
        }}
      >
        {ORDER_STATUSES.find((s) => s.key === status)?.label || "Статус"}
        <span className="status-dd-arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="status-dd-list">
          {ORDER_STATUSES.map((s) => {
            const isCurrent = s.key === status;
            return (
              <button
                key={s.key}
                className={`status-dd-item${isCurrent ? " current" : ""}`}
                onClick={() => {
                  setOpen(false);
                  if (!isCurrent) onChange(s.key);
                }}
                style={{ color: STATUS_COLORS[s.key]?.text || "#1a1a1a" }}
                disabled={isCurrent}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, setPage, limit, setLimit }) {
  if (totalPages <= 1) return null;

  let arr = [];
  let min = Math.max(1, page - 1);
  let max = Math.min(totalPages, page + 1);

  if (page > 2) arr.push(1);
  if (page > 3) arr.push("...");
  for (let i = min; i <= max; ++i) arr.push(i);
  if (page < totalPages - 2) arr.push("...");
  if (page < totalPages - 1) arr.push(totalPages);

  return (
    <div className="pager">
      {arr.map((n, idx) =>
        typeof n === "number" ? (
          <button
            key={n}
            className={`pager-btn ${n === page ? "is-active" : ""}`}
            onClick={() => setPage(n)}
            disabled={n === page}
          >
            {n}
          </button>
        ) : (
          <span key={idx} className="pager-gap">
            {n}
          </span>
        )
      )}
      <button
        className="pager-btn next"
        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
        disabled={page === totalPages}
      >
        Наступна →
      </button>

      <div className="pager-limit">
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="pager-select"
        >
          {PAGE_LIMITS.map((v) => (
            <option key={v} value={v}>
              по {v} позиций
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/api/orders/admin", {
          params: { status: statusFilter, sort: sortOrder, page, limit },
        });
        const list = Array.isArray(data.orders) ? data.orders : data;
        const totalCount =
          data.total ??
          (Array.isArray(data.orders)
            ? data.orders.length
            : Array.isArray(data)
            ? data.length
            : 0);
        setOrders(list);
        setTotal(totalCount || 0);
      } catch (err) {
        console.error("Orders load error:", err);
        setError(
          err?.response?.data?.error ||
            err?.message ||
            "Ошибка загрузки заказов"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter, sortOrder, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === "cancelled") {
      setShowCancelModal(true);
      setCancelOrderId(orderId);
      setPendingStatusChange(newStatus);
      setCancelReason("");
      return;
    }
    try {
      await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
      setOrders((orders) =>
        orders.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (e) {
      console.error("Update status failed:", e);
      alert("Ошибка обновления статуса");
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderId || !cancelReason) return;
    try {
      await api.put(`/api/orders/${cancelOrderId}/cancel`, {
        reason: cancelReason,
      });
      setOrders((orders) =>
        orders.map((o) =>
          o._id === cancelOrderId
            ? { ...o, status: "cancelled", cancelReason }
            : o
        )
      );
      setShowCancelModal(false);
      setCancelReason("");
      setCancelOrderId(null);
      setPendingStatusChange(null);
    } catch (e) {
      console.error("Cancel order failed:", e);
      alert("Ошибка отмены заказа");
    }
  };

  function OrderCard({ order }) {
    const item = order.items && order.items[0];
    const firstImg = item?.product?.images?.[0];
    let img = firstImg
      ? firstImg.startsWith("http")
        ? firstImg
        : `${BASE_URL}${firstImg}`
      : "/images/no-image.png";

    const handleImgError = (e) => {
      e.target.src = "/images/no-image.png";
    };

    return (
      <div className="order-card">
        <img src={img} alt="Товар" className="order-img" onError={handleImgError} />

        <div className="order-info">
          <div className="order-number">№ {order._id.slice(-6)}</div>
          <div className="order-date">
            {new Date(order.createdAt).toLocaleString("ru-RU")}
          </div>
          <div className="order-title">
            {item?.product?.name || "Товар"} ×
            {order.items.reduce((s, i) => s + i.quantity, 0)} шт.
          </div>
        </div>

        <div className="order-total">{order.totalPrice} ₴</div>

        <div className="order-shipping">
          📦 Новая Почта
          <br />
          <span className="order-shipping-highlight">
            {order.novaPoshta || "—"}
          </span>
          <br />
          <span className="order-shipping-highlight">
            {order.address || "—"}
          </span>
          <br />
          <span
            className={`order-pay ${
              order.paymentMethod === "cod" ? "cod" : "card"
            }`}
          >
            {order.paymentMethod === "cod" ? "Наложка" : "Карта"}
          </span>
        </div>

        <div className="order-status">
          <StatusDropdown
            status={order.status}
            onChange={(newStatus) => handleStatusChange(order._id, newStatus)}
          />
          {order.status === "cancelled" && order.cancelReason && (
            <div className="order-cancel-reason">
              Причина: {order.cancelReason}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <AdminSubMenu type="orders" activeKey={statusFilter} />

      <div className="orders-content">
        <div className="orders-filters">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="orders-select"
          >
            <option value="desc">Сначала новые</option>
            <option value="asc">Сначала старые</option>
          </select>

          <input
            type="text"
            placeholder="Поиск..."
            value={""}
            onChange={() => {}}
            className="orders-search"
          />
        </div>

        {error && <div className="orders-error">{error}</div>}

        {loading ? (
          <div className="orders-empty">Загрузка...</div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">Нет заказов</div>
        ) : (
          orders.map((order) => <OrderCard key={order._id} order={order} />)
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
        />
      </div>

      {showCancelModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCancelModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowCancelModal(false)}
            >
              ×
            </button>
            <div className="modal-title">Изменение статуса</div>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="modal-select"
            >
              <option value="">Выберите причину...</option>
              {cancelReasonsList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={handleCancelOrder}
              disabled={!cancelReason}
              className={`modal-danger ${!cancelReason ? "is-disabled" : ""}`}
            >
              Отменить заказ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

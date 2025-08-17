// src/admin/AdminOrdersPage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminSubMenu from './AdminSubMenu';

const apiUrl = import.meta.env.VITE_API_URL || '';

const ORDER_STATUSES = [
  { key: "new", label: "Новый" },
  { key: "processing", label: "В обработке" },
  { key: "done", label: "Выполнен" },
  { key: "cancelled", label: "Отменённый" },
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
  "Не получилось дозвонится"
];

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLORS[status] || STATUS_COLORS["new"];
  return (
    <div style={{ position: "relative", minWidth: 142, width: 160 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          fontWeight: 400,
          borderRadius: 12,
          fontSize: 15,
          height: 38,
          width: "100%",
          background: color.bg,
          color: color.text,
          border: `1.5px solid ${color.border}`,
          boxShadow: "0 0 5px #90ffd929",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {ORDER_STATUSES.find(s => s.key === status)?.label || "Статус"}
        <span style={{ fontSize: 13, marginLeft: 7, opacity: 0.77 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 41,
            left: 0,
            zIndex: 100,
            width: "100%",
            background: "#fff",
            border: "1.2px solid #eee",
            borderRadius: 12,
            boxShadow: "0 6px 20px #00ffc51d",
            padding: "7px 0",
            display: "flex",
            flexDirection: "column",
            gap: 2
          }}
        >
          {ORDER_STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setOpen(false);
                if (s.key !== status) onChange(s.key);
              }}
              style={{
                background: "none",
                border: "none",
                padding: "8px 0",
                color: STATUS_COLORS[s.key]?.text || "#1a1a1a",
                fontSize: 15,
                cursor: s.key === status ? "default" : "pointer",
                opacity: s.key === status ? 0.54 : 1,
                textAlign: "center",
                borderRadius: 8,
                margin: "0 7px"
              }}
              disabled={s.key === status}
            >
              {s.label}
            </button>
          ))}
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
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      margin: "18px 0 0 0",
      flexWrap: "wrap",
    }}>
      {arr.map((n, idx) =>
        typeof n === "number" ? (
          <button
            key={n}
            style={{
              background: n === page ? "#751fff" : "#fff",
              color: n === page ? "#fff" : "#5733b3",
              border: n === page ? "1.7px solid #751fff" : "1.7px solid #e2e0ef",
              borderRadius: 10,
              fontSize: 17,
              padding: "10px 24px",
              cursor: "pointer",
            }}
            onClick={() => setPage(n)}
            disabled={n === page}
          >
            {n}
          </button>
        ) : (
          <span key={idx} style={{ padding: "0 10px", color: "#aaa", fontSize: 18 }}>{n}</span>
        )
      )}
      <button
        style={{
          background: "#fff",
          color: "#5733b3",
          border: "1.7px solid #e2e0ef",
          borderRadius: 10,
          fontSize: 17,
          padding: "10px 24px",
          marginLeft: 3,
          cursor: page === totalPages ? "default" : "pointer",
          opacity: page === totalPages ? 0.45 : 1,
        }}
        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
        disabled={page === totalPages}
      >
        Наступна →
      </button>
      <div style={{ marginLeft: 22 }}>
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          style={{
            borderRadius: 10,
            border: "1.5px solid #e4e8ee",
            background: "#fafcff",
            fontSize: 15,
            padding: "9px 21px 9px 15px",
            cursor: "pointer"
          }}
        >
          {PAGE_LIMITS.map(v =>
            <option key={v} value={v}>по {v} позиций</option>
          )}
        </select>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('new');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      search, status: statusFilter, sort: sortOrder, page, limit
    });
    fetch(`${apiUrl}/api/orders/admin?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка при загрузке');
        setOrders(Array.isArray(data.orders) ? data.orders : data);
        setTotal(data.total || (Array.isArray(data.orders) ? data.orders.length : data.length) || 0);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Ошибка загрузки заказов');
        setLoading(false);
      });
  }, [search, statusFilter, sortOrder, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === "cancelled") {
      setShowCancelModal(true);
      setCancelOrderId(orderId);
      setPendingStatusChange(newStatus);
      setCancelReason('');
      return;
    }
    try {
      await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders(orders =>
        orders.map(o =>
          o._id === orderId ? { ...o, status: newStatus } : o
        )
      );
    } catch {
      alert("Ошибка обновления статуса");
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderId || !cancelReason) return;
    try {
      await fetch(`${apiUrl}/api/orders/${cancelOrderId}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });
      setOrders(orders =>
        orders.map(o =>
          o._id === cancelOrderId
            ? { ...o, status: "cancelled", cancelReason }
            : o
        )
      );
      setShowCancelModal(false);
      setCancelReason('');
      setCancelOrderId(null);
      setPendingStatusChange(null);
    } catch {
      alert("Ошибка отмены заказа");
    }
  };

  function OrderCard({ order }) {
    const item = order.items && order.items[0];
    let img =
      item?.product?.images?.[0]
        ? (item.product.images[0].startsWith("http")
            ? item.product.images[0]
            : apiUrl + item.product.images[0])
        : "/images/no-image.png";
    const handleImgError = e => { e.target.src = "/images/no-image.png"; };
    return (
      <div style={{
        background: "#f7fbff",
        borderRadius: 12,
        padding: "19px",
        marginBottom: 17,
        boxShadow: "0 1px 8px #2291ff0b",
        fontSize: 15,
        display: "flex",
        alignItems: "center",
        gap: 26
      }}>
        <img
          src={img}
          alt="Товар"
          style={{
            width: 54,
            height: 54,
            objectFit: "cover",
            borderRadius: 9,
            background: "#e9f3fa"
          }}
          onError={handleImgError}
        />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ color: "#2291ff", fontSize: 16 }}>
            № {order._id.slice(-6)}
          </div>
          <div style={{ color: "#8ba0b7", fontSize: 15 }}>
            {new Date(order.createdAt).toLocaleString('ru-RU')}
          </div>
          <div>
            {item?.product?.name || 'Товар'} ×{order.items.reduce((s,i)=>s+i.quantity,0)} шт.
          </div>
        </div>
        <div style={{ flex: 1.1 }}>{order.totalPrice} ₴</div>
        <div style={{ flex: 1.6, minWidth: 200 }}>
          <span>{order.user?.name}</span><br />
          <span style={{ color: "#808d9a" }}>{order.user?.email}</span><br />
          <span style={{ color: "#808d9a" }}>{order.user?.phone || '—'}</span>
        </div>
        <div style={{ flex: 2, minWidth: 180 }}>
          📦 Новая Почта<br />
          <span style={{ color: "#1970c1" }}>{order.novaPoshta || "—"}</span><br />
          <span style={{ color: "#1970c1" }}>{order.address || "—"}</span><br />
          <span style={{
            color: order.paymentMethod === 'cod' ? "#ef9c19" : "#24c471"
          }}>{order.paymentMethod === 'cod' ? 'Наложка' : 'Карта'}</span>
        </div>
        <div>
          <StatusDropdown
            status={order.status}
            onChange={newStatus => handleStatusChange(order._id, newStatus)}
          />
          {order.status === 'cancelled' && order.cancelReason && (
            <div style={{ color: "#e12a2a", marginTop: 8, fontSize: 14 }}>
              Причина: {order.cancelReason}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", padding: "38px 0" }}>
      <AdminSubMenu
        type="orders"
        title="Управление заказами"
        activeKey={statusFilter}
        onSelect={key => { setStatusFilter(key); setPage(1); }}
      />

      <div style={{
        flex: 1,
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 2px 12px #2291ff0c",
        padding: "28px 24px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 26,
          flexWrap: "wrap",
        }}>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
            style={{ padding: "7px 17px", borderRadius: 9 }}>
            <option value="desc">Сначала новые</option>
            <option value="asc">Сначала старые</option>
          </select>
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              padding: "11px 19px",
              borderRadius: 12,
              border: "1.5px solid #e4e8ee",
              minWidth: 270,
            }}
          />
        </div>

        {error && <div style={{ color: "#f34c4c" }}>{error}</div>}
        {loading ? (
          <div style={{ textAlign: "center", marginTop: 60 }}>Загрузка...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 80 }}>Нет заказов</div>
        ) : (
          orders.map(order => <OrderCard key={order._id} order={order} />)
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
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100%', minHeight: '100%', zIndex: 1001,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowCancelModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 34, minWidth: 330,
            boxShadow: '0 8px 44px #174ec32f'
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCancelModal(false)} style={{
              position: "absolute", top: 14, right: 16, fontSize: 22, background: "none", border: "none"
            }}>×</button>
            <div style={{ fontSize: 20, marginBottom: 18 }}>Изменение статуса</div>
            <select
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              style={{ width: '100%', marginBottom: 22 }}
            >
              <option value="">Выберите причину...</option>
              {cancelReasonsList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={handleCancelOrder}
              disabled={!cancelReason}
              style={{
                width: "100%", background: "#e12a2a", color: "#fff",
                borderRadius: 9, padding: "11px 0", cursor: !cancelReason ? "not-allowed" : "pointer",
                opacity: !cancelReason ? 0.65 : 1
              }}
            >
              Отменить заказ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

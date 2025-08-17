// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import NavMenu from '../components/NavMenu';
import SideMenu from '../components/SideMenu';
import Footer from '../components/Footer';
import '../assets/ProfilePage.css';
import { useNavigate, Link } from 'react-router-dom';

const apiUrl = import.meta.env.VITE_API_URL || '';

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('profileActiveTab') || 'profile';
  });
  const [orders, setOrders] = useState([]);
  const [modalOrder, setModalOrder] = useState(null);

  // --- Для отмены заказа ---
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOrderId, setCancelOrderId] = useState(null);

  const cancelReasons = [
    'Нашёл дешевле у конкурентов',
    'Срок доставки слишком долгий',
    'Ошибся при оформлении заказа',
    'Хочу изменить/добавить товары',
  ];

  function fetchOrders() {
    const token = localStorage.getItem('token');
    fetch(`${apiUrl}/api/orders/my`, {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(res => res.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]));
  }

  useEffect(() => {
    if (activeTab === 'orders' && user) {
      fetchOrders();
    }
  }, [activeTab, user]);

  const handleSetActiveTab = (key) => {
    setActiveTab(key);
    localStorage.setItem('profileActiveTab', key);
  };

  const menu = [
    { key: 'profile', label: 'Профиль' },
    { key: 'orders', label: 'История заказов' },
    { key: 'password', label: 'Безопасность' },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  function handleRepeatOrder(order) {
    if (!order || !order.items) return;
    order.items.forEach(item => {
      if (item.product) {
        addToCart(item.product, item.quantity || 1);
      }
    });
    navigate('/cart');
  }

  async function handleCancelOrder(orderId, reason) {
    if (!orderId) return;
    try {
      const token = localStorage.getItem('token');
      // ВАЖНО: пользовательский маршрут
      const res = await fetch(`${apiUrl}/api/orders/${orderId}/cancel-my`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      fetchOrders();
      setShowCancelModal(false);
      setCancelReason('');
      setCancelOrderId(null);
      setModalOrder(null);
    } catch (err) {
      alert('Ошибка при отмене заказа!');
    }
  }

  return (
    <>
      <div className="main-container">
        <Header />
        <NavMenu />
        <div className="profile-page-row">
          <div style={{ minWidth: 210 }}>
            <SideMenu />
          </div>
          <div className="profile-page-content">
            <div className="profile-page-cabinet-menu">
              {menu.map(item => (
                <button
                  key={item.key}
                  className={`profile-cabinet-link${activeTab === item.key ? ' active' : ''}`}
                  onClick={() => handleSetActiveTab(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
              <button className="profile-cabinet-link logout" onClick={handleLogout}>
                Выйти
              </button>
            </div>

            {activeTab === 'profile' && <ProfileInfoBlock user={user} setUser={setUser} />}
            {activeTab === 'orders' && (
              <OrdersBlock
                orders={orders}
                onOrderClick={setModalOrder}
                onRepeatOrder={handleRepeatOrder}
                onCancelOrderBtn={orderId => {
                  setCancelOrderId(orderId);
                  setShowCancelModal(true);
                  setCancelReason('');
                }}
              />
            )}
            {activeTab === 'password' && <PasswordBlock />}

            {modalOrder && (
              <OrderModal
                order={orders.find(o => o._id === modalOrder._id) || modalOrder}
                onClose={() => setModalOrder(null)}
              />
            )}

            {showCancelModal && (
              <div className="order-modal-overlay" onClick={() => setShowCancelModal(false)}>
                <div className="order-modal-window cancel-modal" onClick={e => e.stopPropagation()}>
                  <button className="order-modal-close" onClick={() => setShowCancelModal(false)}>×</button>
                  <div className="order-modal-header">
                    <h4>Подтвердите действие</h4>
                  </div>
                  <label className="order-modal-reason-label">
                    Почему вы хотите отменить заказ?
                  </label>
                  <select
                    className="cancel-reason-select"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                  >
                    <option value="">Выберите причину...</option>
                    {cancelReasons.map((r, i) => (
                      <option value={r} key={i}>{r}</option>
                    ))}
                  </select>
                  <button
                    className="cancel-order-btn"
                    disabled={!cancelReason}
                    onClick={async () => {
                      await handleCancelOrder(cancelOrderId, cancelReason);
                    }}
                  >
                    Подтвердить отмену
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

// ---- Блок профиля ----
function ProfileInfoBlock({ user, setUser }) {
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    surname: user?.surname || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const regDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ru-RU')
    : '-';

  useEffect(() => {
    setForm({
      name: user?.name || '',
      surname: user?.surname || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
    setError('');
    setSuccess('');
  }, [user]);

  const handleEditToggle = () => {
    setEdit(e => !e);
    setError('');
    setSuccess('');
  };

  const handleChange = e => {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
    setError('');
    setSuccess('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setEdit(false);
        setSuccess('Профиль успешно обновлён!');
      } else {
        setError(data?.error || 'Ошибка при сохранении!');
      }
    } catch {
      setError('Ошибка при сохранении!');
    }
    setLoading(false);
  };

  return (
    <div className="profile-card-block">
      <div className="profile-block-header">
        <h2 className="profile-title2">Профиль пользователя</h2>
        <button className="profile-edit-btn" onClick={handleEditToggle} title="Редактировать">
          ✏️
        </button>
      </div>
      <form className="profile-data-list" onSubmit={handleSave}>
        <div className="profile-data-row">
          <label>Имя</label>
          {edit
            ? <input name="name" value={form.name} onChange={handleChange} className="profile-input" autoFocus />
            : <span>{user?.name || '-'}</span>
          }
        </div>
        <div className="profile-data-row">
          <label>Фамилия</label>
          {edit
            ? <input name="surname" value={form.surname} onChange={handleChange} className="profile-input" />
            : <span>{user?.surname || '-'}</span>
          }
        </div>
        <div className="profile-data-row">
          <label>Телефон</label>
          {edit
            ? <input name="phone" value={form.phone} onChange={handleChange} className="profile-input" />
            : <span>{user?.phone || '-'}</span>
          }
        </div>
        <div className="profile-data-row">
          <label>Email</label>
          {edit
            ? <input name="email" value={form.email} onChange={handleChange} className="profile-input" />
            : <span>{user?.email || '-'}</span>
          }
        </div>

        {edit && (
          <div className="profile-edit-actions">
            <button type="submit" className="profile-save-btn" disabled={loading}>
              {loading ? 'Сохраняю...' : 'Сохранить'}
            </button>
            <button type="button" className="profile-cancel-btn" onClick={handleEditToggle} disabled={loading}>
              Отмена
            </button>
          </div>
        )}

        {error && <div className="profile-error-msg">{error}</div>}
        {success && <div className="profile-success-msg">{success}</div>}
      </form>

      <div className="profile-bottom-block">
        <a href="/my-reviews" className="profile-reviews-link">Мои отзывы</a>
        <div className="profile-reg-date">
          Дата регистрации: <b>{regDate}</b>
        </div>
      </div>
    </div>
  );
}

// ---- История заказов ----
function OrdersBlock({ orders, onOrderClick, onRepeatOrder, onCancelOrderBtn }) {
  const lastOrder = orders && orders.length > 0 ? orders[0] : null;
  const prevOrders = orders && orders.length > 1 ? orders.slice(1) : [];

  const ORDERS_PER_PAGE = 5;
  const [page, setPage] = React.useState(1);
  React.useEffect(() => { setPage(1); }, [orders]);
  const paginatedOrders = prevOrders.slice((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(prevOrders.length / ORDERS_PER_PAGE));

  function renderOrderTable(order, isLastOrder = false) {
    return (
      <div className="order-list-table" key={order._id}>
        <div className="order-table-header">
          <span>№ {order.number || order._id?.slice(-5)}</span>
          <span className={`order-status order-status-${order.status}`}>
            <span className="order-status-dot" />
            {orderStatusLabel(order.status)}
          </span>
          <span style={{ marginLeft: 'auto' }}>{formatDate(order.createdAt)}</span>
        </div>
        <div className="order-table-items">
          <div className="order-table-row order-table-row-head">
            <span>Название</span>
            <span className="order-table-cell-right">Код</span>
            <span className="order-table-cell-right">Кол-во</span>
            <span className="order-table-cell-right">Цена</span>
          </div>
          {order.items.map((item, idx) => (
            <div className="order-table-row" key={item.product?._id || idx}>
              <span className="nowrap">{item.product?.name || <i>Товар не найден</i>}</span>
              <span className="order-table-cell-right">{item.product?.sku || '-'}</span>
              <span className="order-table-cell-right">{item.quantity} шт.</span>
              <span className="order-table-cell-right">{item.product?.price ? `${item.product.price} ₴` : '-'}</span>
            </div>
          ))}
        </div>
        <div className="order-table-footer">
          <div>
            {!isLastOrder && (
              <button
                className="repeat-order-btn"
                onClick={e => {
                  e.stopPropagation();
                  onRepeatOrder(order);
                }}
              >
                Повторить заказ
              </button>
            )}
            {order.status === 'new' && (
              <button
                className="cancel-order-btn"
                style={!isLastOrder ? { marginLeft: 10 } : {}}
                onClick={e => {
                  e.stopPropagation();
                  onCancelOrderBtn(order._id);
                }}
              >
                Отменить заказ
              </button>
            )}
          </div>
          <span className="order-total-text">
            Общая сумма: <b>{order.totalPrice} ₴</b>
          </span>
        </div>
        {order.status === 'cancelled' && (
          <div style={{ marginTop: 7, color: '#e04141' }}>
            Заказ отменён{order.cancelReason ? `: ${order.cancelReason}` : ''}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="orders-block">
      <h2 className="profile-title2">Ваш последний заказ</h2>
      {lastOrder ? (
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => onOrderClick(lastOrder)}
        >
          {renderOrderTable(lastOrder, true)}
        </div>
      ) : (
        <div className="orders-empty">Заказов пока нет.</div>
      )}

      <h3 className="orders-list-title" style={{ marginTop: 28, marginBottom: 12 }}>Все заказы</h3>
      {prevOrders.length === 0 && (
        <div className="orders-empty">Нет предыдущих заказов.</div>
      )}
      <div className="orders-list">
        {paginatedOrders.map(order => (
          <div
            key={order._id}
            style={{ cursor: 'pointer' }}
            onClick={() => onOrderClick(order)}
          >
            {renderOrderTable(order, false)}
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="orders-pagination" style={{ justifyContent: 'center' }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              className={`orders-page-btn${i + 1 === page ? ' active' : ''}`}
              key={i}
              onClick={() => {
                setPage(i + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Модалка заказа ----
function OrderModal({ order, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const itemsCount = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="order-modal-overlay" onClick={onClose}>
      <div className="order-modal-window order-modal-wide" onClick={e => e.stopPropagation()}>
        <button className="order-modal-close" onClick={onClose}>×</button>
        <div className="order-modal-flex2col">
          {/* Левая колонка */}
          <div className="order-modal-left">
            <div className="order-modal-header-row">
              <div>
                <div className="order-modal-num">№ {order.number || order._id?.slice(-5)}</div>
                <div className={`order-status order-status-${order.status}`}>
                  <span className="order-status-dot" />
                  {orderStatusLabel(order.status)}
                </div>
              </div>
              <div className="order-modal-date">{formatDate(order.createdAt)}</div>
            </div>
            <div className="order-modal-label2">Информация</div>
            <div className="order-modal-info2">
              <div className="order-modal-info-row">
                <span className="order-modal-info-label">Контакт:</span>
                <span>{order.contactName} {order.contactSurname}</span>
              </div>
              <div className="order-modal-info-row">
                <span className="order-modal-info-label">Телефон:</span>
                <span>{order.contactPhone}</span>
              </div>
              <div className="order-modal-info-row">
                <span className="order-modal-info-label">Адрес:</span>
                <span>
                  {order.address}{order.novaPoshta ? `, ${order.novaPoshta}` : ''}
                </span>
              </div>
            </div>
          </div>
          {/* Правая колонка: Товары */}
          <div className="order-modal-right">
            <div className="order-modal-products-list">
              <div className="order-modal-products-header">
                <span className="order-modal-prod-imgcell"></span>
                <span>Название</span>
                <span>Код</span>
                <span>Кол-во</span>
                <span>Цена</span>
              </div>
              {order.items.map((item, idx) =>
                item.product ? (
                  <div className="order-modal-products-row" key={item.product._id || idx}>
                    <span className="order-modal-prod-imgcell">
                      <img
                        src={item.product.images && item.product.images.length
                          ? item.product.images[0].startsWith('http')
                            ? item.product.images[0]
                            : `${apiUrl}${item.product.images[0]}`
                          : '/images/no-image.webp'
                        }
                        alt=""
                        className="order-modal-prod-img"
                      />
                    </span>
                    <span className="order-modal-prod-title">
                      <Link
                        to={`/product/${item.product._id}`}
                        className="order-item-title-link"
                        onClick={onClose}
                      >
                        {item.product.name}
                      </Link>
                    </span>
                    <span className="order-modal-prod-sku">{item.product.sku || '-'}</span>
                    <span className="order-modal-prod-qty">{item.quantity}</span>
                    <span className="order-modal-prod-price">{item.product.price} ₴</span>
                  </div>
                ) : (
                  <div className="order-modal-products-row" key={idx}>
                    <span className="order-modal-prod-imgcell"></span>
                    <span style={{ color: '#d00' }}>Товар не найден</span>
                    <span>-</span>
                    <span>-</span>
                    <span>-</span>
                  </div>
                )
              )}
            </div>
            <div className="order-modal-summary">
              <div>Товаров: <b>{itemsCount}</b></div>
              <div>Общая сумма: <b>{order.totalPrice} ₴</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==== ВСПОМОГАТЕЛЬНЫЕ ====
function orderStatusLabel(status) {
  switch (status) {
    case 'new': return 'Новый';
    case 'processing': return 'В обработке';
    case 'shipped': return 'Отправлен';
    case 'done':
    case 'completed': return 'Выполнен';
    case 'cancelled': return 'Отменён';
    default: return status || '-';
  }
}
function formatDate(date) {
  return date ? new Date(date).toLocaleString('ru-RU') : '-';
}

// ==== Блок смены пароля ====
function PasswordBlock() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = setter => e => {
    setter(e.target.value);
    setError('');
    setSuccess('');
    };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!oldPassword || !newPassword || !repeatPassword) {
      setError('Заполните все поля');
      return;
    }
    if (newPassword !== repeatPassword) {
      setError('Новые пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/users/password`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Пароль успешно изменён');
        setOldPassword('');
        setNewPassword('');
        setRepeatPassword('');
      } else {
        setError(data?.error || 'Ошибка при смене пароля');
      }
    } catch {
      setError('Ошибка при смене пароля');
    }
    setLoading(false);
  }

  return (
    <div className="profile-card-block">
      <h2 className="profile-title2">Смена пароля</h2>
      <form className="profile-data-list" onSubmit={handleSubmit} style={{ maxWidth: 480, marginLeft: 0 }}>
        <div className="profile-data-row">
          <label>Старый пароль</label>
          <div className="profile-password-wrap">
            <input
              type={showOld ? 'text' : 'password'}
              className="profile-input"
              value={oldPassword}
              onChange={handleChange(setOldPassword)}
              autoComplete="current-password"
              style={{ width: '100%' }}
            />
            <button
              type="button"
              className="password-eye-btn"
              onClick={() => setShowOld(v => !v)}
              tabIndex={-1}
              aria-label={showOld ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showOld ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div className="profile-data-row">
          <label>Новый пароль</label>
          <div className="profile-password-wrap">
            <input
              type={showNew ? 'text' : 'password'}
              className="profile-input"
              value={newPassword}
              onChange={handleChange(setNewPassword)}
              autoComplete="new-password"
              style={{ width: '100%' }}
            />
            <button
              type="button"
              className="password-eye-btn"
              onClick={() => setShowNew(v => !v)}
              tabIndex={-1}
              aria-label={showNew ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showNew ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div className="profile-data-row">
          <label>Повторите новый</label>
          <div className="profile-password-wrap">
            <input
              type={showRepeat ? 'text' : 'password'}
              className="profile-input"
              value={repeatPassword}
              onChange={handleChange(setRepeatPassword)}
              autoComplete="new-password"
              style={{ width: '100%' }}
            />
            <button
              type="button"
              className="password-eye-btn"
              onClick={() => setShowRepeat(v => !v)}
              tabIndex={-1}
              aria-label={showRepeat ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showRepeat ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div className="profile-edit-actions">
          <button type="submit" className="profile-save-btn" disabled={loading} style={{ minWidth: 140 }}>
            {loading ? 'Сохраняю...' : 'Сменить пароль'}
          </button>
        </div>
        {error && <div className="profile-error-msg">{error}</div>}
        {success && <div className="profile-success-msg">{success}</div>}
      </form>
    </div>
  );
}

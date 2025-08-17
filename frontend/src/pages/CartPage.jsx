import React, { useState } from 'react';
import SideMenu from '../components/SideMenu';
import Header from '../components/Header';
import NavMenu from '../components/NavMenu';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import '../assets/CartPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function formatPrice(price) {
  return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function getProductData(item) {
  const product = item.product || item;
  return {
    id: product._id || item._id,
    name: product.name || item.name || 'Без названия',
    sku: product.sku || item.sku || '-',
    unit: product.unit || item.unit || 'шт',
    price: Number(product.price || item.price || 0),
    quantity: item.quantity || item.qty || 1,
    image:
      (product.images && product.images.length
        ? (product.images[0].startsWith('http')
            ? product.images[0]
            : API_URL.replace(/\/$/, '') + product.images[0])
        : product.image
          ? (product.image.startsWith('http')
              ? product.image
              : API_URL.replace(/\/$/, '') + product.image)
          : 'https://dummyimage.com/240x180/eee/aaa.png&text=Нет+фото'
      )
  };
}

const recommendedProducts = [
  {
    _id: 'r1',
    name: 'Каркасная штора DAF XF 105-106',
    price: 700,
    sku: 'R-001',
    images: ['https://dummyimage.com/120x90/aaa/fff.png&text=R1'],
    desc: 'Лёгкая, компактная штора для защиты кабины DAF от солнца и посторонних взглядов.',
  },
  {
    _id: 'r2',
    name: 'Лампа дальнего света Bosch',
    price: 1280,
    sku: 'R-002',
    images: ['https://dummyimage.com/120x90/eee/333.png&text=R2'],
    desc: 'Яркая автомобильная лампа дальнего света. Отличная видимость в тёмное время суток.',
  },
  {
    _id: 'r3',
    name: 'Щётка стеклоочистителя Hella',
    price: 2990,
    sku: 'R-003',
    images: ['https://dummyimage.com/120x90/dde/222.png&text=R3'],
    desc: 'Эффективно очищает лобовое стекло даже в сильный дождь и снег.',
  },
  {
    _id: 'r4',
    name: 'Ремень генератора Gates',
    price: 2200,
    sku: 'R-004',
    images: ['https://dummyimage.com/120x90/bbf/111.png&text=R4'],
    desc: 'Прочный ремень для генератора. Гарантия качества от Gates.',
  },
  {
    _id: 'r5',
    name: 'Масляный фильтр Mann',
    price: 520,
    sku: 'R-005',
    images: ['https://dummyimage.com/120x90/faf/444.png&text=R5'],
    desc: 'Оригинальный фильтр для чистого масла и долговечности двигателя.',
  },
];

function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  const [removingIds, setRemovingIds] = useState([]);

  const total = cartItems.reduce((sum, item) => {
    const { price, quantity } = getProductData(item);
    return sum + (isNaN(price) ? 0 : price * quantity);
  }, 0);

  const handleRemove = (id) => {
    setRemovingIds((ids) => [...ids, id]);
    setTimeout(() => {
      removeFromCart(id);
      setRemovingIds((ids) => ids.filter((_id) => _id !== id));
    }, 340);
  };

  return (
    <>
      {/* wrapper для локализации нейтральных теней и фоновых переменных */}
      <div className="cart-page">
        <div className="main-container">
          <Header />
          <NavMenu />

          <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', marginTop: 16, gap: 24 }}>
            <div style={{ minWidth: 210 }}>
              <SideMenu />
            </div>

            <div style={{ flex: 1 }}>
              <div className="block-title-info" style={{ marginBottom: 18 }}>
                КОРЗИНА
              </div>

              <div className="cart-section-white">
                {cartItems.length === 0 ? (
                  <div className="cart-empty-block">
                    <div className="cart-empty-block-title" style={{ display: 'flex', alignItems: 'center', fontSize: 28 }}>
                      <span style={{ fontSize: 32, marginRight: 10, opacity: 0.55 }}>🛒</span>
                      Корзина пуста
                    </div>
                    <button className="btn-continue" onClick={() => navigate('/')}>
                      Продолжить покупки.
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="products-list" style={{ gap: 0 }}>
                      {cartItems.map((item, idx) => {
                        const { id, name, sku, unit, price, quantity, image } = getProductData(item);
                        const isRemoving = removingIds.includes(id);
                        return (
                          <React.Fragment key={id}>
                            <div
                              className="cart-modern-row"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: 13,
                                padding: '13px 14px',
                                boxShadow: '0 2px 7px var(--color-cart-section-shadow)',
                                transition: 'opacity .33s, transform .33s',
                                opacity: isRemoving ? 0 : 1,
                                transform: isRemoving ? 'scale(0.93)' : 'scale(1)',
                              }}
                            >
                              <Link to={`/product/${id}`}>
                                <img
                                  src={image}
                                  alt={name}
                                  style={{
                                    width: 92,
                                    height: 92,
                                    objectFit: 'contain',
                                    background: 'var(--color-cart-section-bg)',
                                    border: '1.2px solid var(--color-cart-border)',
                                    borderRadius: 10,
                                    marginRight: 12,
                                    cursor: 'pointer',
                                  }}
                                />
                              </Link>

                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                }}
                              >
                                <Link
                                  to={`/product/${id}`}
                                  style={{
                                    fontSize: 16,
                                    color: 'var(--color-cart-link)',
                                    textDecoration: 'none',
                                    marginBottom: 7,
                                    wordBreak: 'break-word',
                                    display: 'inline-block',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {name}
                                </Link>

                                <div style={{ fontSize: 15, color: 'var(--color-cart-meta)', marginBottom: 3, lineHeight: 1.35 }}>
                                  <span style={{ color: 'var(--color-cart-meta)' }}>Цена: </span>
                                  <span style={{ color: 'var(--color-cart-price)' }}>{formatPrice(price)} грн</span>
                                </div>
                                <div style={{ fontSize: 15, color: 'var(--color-cart-meta)', marginBottom: 2 }}>
                                  Код товара: <span style={{ color: 'var(--color-cart-meta)' }}>{sku}</span>
                                </div>
                                <div style={{ fontSize: 15, color: 'var(--color-cart-meta)' }}>
                                  Ед. измерения: <span style={{ color: 'var(--color-cart-price)' }}>{unit}</span>
                                </div>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  minWidth: 150,
                                  gap: 10,
                                  height: '100%',
                                }}
                              >
                                <button
                                  className="cart-qty-btn"
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1.3px solid var(--color-cart-border)',
                                    background: 'var(--color-cart-blue-light)',
                                    color: 'var(--color-cart-blue-dark)',
                                    fontWeight: 400,
                                    fontSize: 15,
                                    cursor: quantity === 1 ? 'not-allowed' : 'pointer',
                                  }}
                                  onClick={() => updateQuantity(id, Math.max(1, quantity - 1))}
                                  disabled={quantity === 1}
                                >
                                  -
                                </button>

                                <input
                                  type="number"
                                  min={1}
                                  max={999}
                                  value={quantity}
                                  onChange={(e) => {
                                    let val = Number(e.target.value.replace(/\D/g, ''));
                                    if (!val || val < 1) val = 1;
                                    updateQuantity(id, val);
                                  }}
                                  style={{
                                    width: 34,
                                    height: 32,
                                    textAlign: 'center',
                                    fontWeight: 400,
                                    fontSize: 15,
                                    color: 'var(--color-cart-blue-dark)',
                                    border: '1.1px solid var(--color-cart-border)',
                                    borderRadius: 8,
                                    outline: 'none',
                                    background: 'var(--color-cart-section-bg)',
                                    margin: '0 1px',
                                  }}
                                  onFocus={(e) => e.target.select()}
                                />

                                <button
                                  className="cart-qty-btn"
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1.3px solid var(--color-cart-border)',
                                    background: 'var(--color-cart-blue-light)',
                                    color: 'var(--color-cart-blue-dark)',
                                    fontWeight: 400,
                                    fontSize: 15,
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => updateQuantity(id, quantity + 1)}
                                >
                                  +
                                </button>

                                <button
                                  className="cart-remove-btn"
                                  onClick={() => handleRemove(id)}
                                  style={{
                                    marginLeft: 12,
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    background: 'none',
                                    color: 'var(--color-cart-remove)',
                                    border: 'none',
                                    fontWeight: 400,
                                    fontSize: 22,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'none',
                                  }}
                                  title="Удалить"
                                  disabled={isRemoving}
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            {idx !== cartItems.length - 1 && (
                              <div
                                style={{
                                  width: '97%',
                                  margin: '0 auto',
                                  borderBottom: '1.3px solid var(--color-cart-section-border)',
                                  borderRadius: 2,
                                }}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <div className="cart-summary-row">
                      <div className="cart-total-label">
                        Сумма заказа: <span className="cart-total-value">{formatPrice(total)} грн</span>
                      </div>
                      <div className="cart-actions">
                        <button className="cart-btn cart-btn--continue" onClick={() => navigate('/')}>
                          Вернуться
                        </button>
                        <button className="cart-btn cart-btn--clear" onClick={clearCart}>
                          Очистить
                        </button>
                        <button className="cart-btn cart-btn--order" onClick={() => navigate('/checkout')}>
                          Оформить
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="cart-section-white" style={{ marginTop: 36, marginBottom: 0 }}>
                <div className="recommend-title">Мы рекомендуем</div>
                <div className="recommend-list">
                  {recommendedProducts.map((p) => (
                    <div className="recommend-item" key={p._id}>
                      <img className="recommend-img" src={p.images?.[0]} alt={p.name} />
                      <div className="recommend-info">
                        <Link className="recommend-name" to={`/product/${p._id}`}>
                          {p.name}
                        </Link>
                        <div className="recommend-desc">{p.desc}</div>
                      </div>
                      <div className="recommend-meta">
                        <div className="recommend-price">
                          {formatPrice(p.price)} <span>грн</span>
                        </div>
                        <Link className="recommend-btn" to={`/product/${p._id}`}>
                          Подробнее
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default CartPage;

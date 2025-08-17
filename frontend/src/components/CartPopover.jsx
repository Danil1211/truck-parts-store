import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "../assets/CartPopover.css";

function formatPrice(price) {
  return Number(price || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function getProductData(item) {
  const product = item.product || item;
  const API_URL = import.meta.env.VITE_API_URL || "";
  return {
    id: product._id || item._id,
    name: product.name || item.name || "Без названия",
    price: Number(product.price || item.price || 0),
    quantity: item.quantity || item.qty || 1,
    image:
      (product.images && product.images.length
        ? (product.images[0].startsWith("http")
            ? product.images[0]
            : API_URL.replace(/\/$/, "") + product.images[0])
        : product.image
          ? (product.image.startsWith("http")
              ? product.image
              : API_URL.replace(/\/$/, "") + product.image)
          : "https://dummyimage.com/60x60/eee/aaa.png&text=Нет+фото")
  };
}

export default function CartPopover({ open, onClose }) {
  const { cartItems, removeFromCart } = useCart();
  const navigate = useNavigate();
  const popRef = useRef(null);

  const closeTimer = useRef(null);
  const startClose = (delay = 180) => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => onClose?.(), delay);
  };
  const cancelClose = () => clearTimeout(closeTimer.current);

  const items = cartItems.map(getProductData);
  const total = items.reduce((sum, it) => sum + (isNaN(it.price) ? 0 : it.price * it.quantity), 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(closeTimer.current);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={popRef}
      className="cart-popover"
      role="dialog"
      aria-label="Корзина"
      onMouseEnter={cancelClose}
      onMouseLeave={() => startClose(180)}
    >
      <div className="cart-popover-header">Корзина</div>

      <div className="cart-popover-list">
        {items.length === 0 ? (
          <div className="cart-popover-empty">В корзине нет товаров.</div>
        ) : (
          items.map((item) => (
            <div className="cart-popover-row" key={item.id}>
              <img src={item.image} alt={item.name} className="cart-popover-img" />

              <div className="cart-popover-details">
                <Link
                  to={`/product/${item.id}`}
                  className="cart-popover-title"
                  onClick={onClose}
                  title={item.name}
                >
                  {item.name?.length > 60 ? item.name.slice(0, 59) + "…" : item.name}
                </Link>

                <div className="cart-popover-qty-price">
                  <span>{formatPrice(item.price)} грн × {item.quantity}</span>
                  <span className="cart-popover-row-sum">
                    {formatPrice(item.price * item.quantity)} грн
                  </span>
                </div>
              </div>

              <button
                className="cart-popover-remove"
                title="Удалить"
                onClick={() => removeFromCart(item.id)}
                aria-label="Удалить из корзины"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <>
          <div className="cart-popover-total-row">
            <span className="cart-popover-total-label">Сумма заказа:</span>
            <span className="cart-popover-total">{formatPrice(total)} грн</span>
          </div>

          <div className="cart-popover-actions">
            <button
              className="cart-popover-btn cart-popover-btn--outline"
              onClick={() => { onClose?.(); navigate("/cart"); }}
            >
              Перейти в корзину
            </button>

            <button
              className="cart-popover-btn cart-popover-btn--checkout"
              onClick={() => { onClose?.(); navigate("/checkout"); }}
            >
              Оформить заказ
            </button>
          </div>
        </>
      )}
    </div>
  );
}

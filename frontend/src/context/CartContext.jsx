// src/context/CartContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext();

/** Безопасное чтение JSON из localStorage */
function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Нормализация продукта */
function normalizeProduct(p) {
  if (!p || typeof p !== "object") return null;
  const {
    _id,
    name = "",
    price = 0,
    images = [],
    availability = "В наличии",
    unit = "шт",
    sku = ""
  } = p;
  if (!_id) return null;
  return { _id, name, price: Number(price) || 0, images, availability, unit, sku };
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => readLS("cartItems", []));

  // сохраняем корзину в localStorage
  useEffect(() => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  /** Добавить товар */
  const addToCart = (product, quantity = 1) => {
    const np = normalizeProduct(product);
    const qty = Math.max(1, Number(quantity) || 1);
    if (!np) return;
    if ((np.availability || "").trim() === "Нет в наличии") return;

    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.product._id === np._id);
      if (idx === -1) {
        return [...prev, { product: np, quantity: qty }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
      return next;
    });
  };

  /** Обновить количество вручную */
  const updateQuantity = (id, newQuantity) => {
    const q = Math.max(1, Math.min(999, Number(newQuantity) || 1));
    setCartItems((prev) =>
      prev.map((item) =>
        item.product._id === id ? { ...item, quantity: q } : item
      )
    );
  };

  /** Увеличить / уменьшить */
  const inc = (id, step = 1) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product._id === id
          ? { ...item, quantity: Math.max(1, Math.min(999, item.quantity + step)) }
          : item
      )
    );
  };
  const dec = (id) => inc(id, -1);

  /** Удалить товар */
  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((i) => i.product._id !== id));
  };

  /** Очистить корзину */
  const clearCart = () => setCartItems([]);

  /** Подсчёты */
  const totalCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () =>
      cartItems.reduce(
        (sum, i) =>
          sum + (Number(i.product?.price) || 0) * (Number(i.quantity) || 0),
        0
      ),
    [cartItems]
  );

  /** Обновить данные продукта (например, если изменилась цена на бэке) */
  const refreshProductInCart = (freshProduct) => {
    const np = normalizeProduct(freshProduct);
    if (!np) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.product._id === np._id
          ? { ...item, product: { ...item.product, ...np } }
          : item
      )
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        inc,
        dec,
        removeFromCart,
        clearCart,
        totalCount,
        totalPrice,
        refreshProductInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

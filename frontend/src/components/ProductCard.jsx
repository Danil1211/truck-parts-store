import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useSite } from "../context/SiteContext";
import { triggerAddToCartFly } from "./AddToCartAnimation";
import { cartIconRef } from "./Header";
import "../assets/ProductCard.css";

const API_URL =
  import.meta.env.VITE_API_URL || "https://truck-parts-backend.onrender.com";

/**
 * @param {{product: any, view?: 'grid'|'list'|'rows'|'row'|'line'}} props
 */
export default function ProductCard({ product, view = "grid" }) {
  const navigate = useNavigate();
  const imgRef = useRef();
  const { addToCart } = useCart();
  const { display } = useSite();

  const [quantity, setQuantity] = useState(1);

  // режим
  const mode = String(view || "grid").toLowerCase();
  const isList =
    mode === "list" || mode === "rows" || mode === "row" || mode === "line";

  // картинка
  let imageUrl = "https://dummyimage.com/600x600/eeeeee/888.png&text=Нет+фото";
  if (product?.images?.length) {
    imageUrl = product.images[0].startsWith("http")
      ? product.images[0]
      : API_URL.replace(/\/$/, "") + product.images[0];
  }

  // данные
  const available = product?.availability !== false;
  const title = (product?.name || "Название товара").trim();
  const priceValue = typeof product?.price === "number" ? product.price : 0;
  const price = `${priceValue.toFixed(2)} грн.`;
  const sku = product?.sku || "—";
  const unit = product?.unit || "штука";
  const stockNum =
    typeof product?.stock === "number" ? product.stock : available ? 11 : 0;
  const stockText =
    stockNum > 10
      ? "ОСТАТОК > 10"
      : stockNum > 0
      ? `ОСТАТОК: ${stockNum}`
      : "НЕТ В НАЛИЧИИ";

  // handlers
  const handleNavigate = () => navigate(`/product/${product?._id}`);
  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (imgRef.current && cartIconRef.current) {
      const fromRect = imgRef.current.getBoundingClientRect();
      const toRect = cartIconRef.current.getBoundingClientRect();
      triggerAddToCartFly(imageUrl, fromRect, toRect);
    }
    addToCart(product, quantity);
  };
  const inc = (e) => {
    e.stopPropagation();
    setQuantity((q) => q + 1);
  };
  const dec = (e) => {
    e.stopPropagation();
    setQuantity((q) => (q > 1 ? q - 1 : 1));
  };

  // палитра
  const colorVars = {
    "--pc-primary": display?.palette?.["primary"],
    "--pc-primary-dark": display?.palette?.["primary-dark"],
    "--pc-title": display?.palette?.title,
    // яркая цена: сначала priceStrong, потом price, потом fallback
    "--pc-price-strong":
      display?.palette?.priceStrong ||
      display?.palette?.price ||
      display?.palette?.primary ||
      "#1ea84a", // насыщённый зелёный по умолчанию
  };

  const qtyInput = (
    <input
      type="number"
      value={quantity}
      min={1}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        let v = parseInt(e.target.value, 10);
        if (isNaN(v) || v < 1) v = 1;
        setQuantity(v);
      }}
      onWheel={(e) => e.target.blur()}
      className="pc-qty-input"
    />
  );

  // ===== LIST =====
  if (isList) {
    return (
      <div
        className="pc-card modern pc-list-card"
        data-view="list"
        style={colorVars}
        onClick={handleNavigate}
      >
        {/* ЛЕВО: фото */}
        <div className="pc-list-thumb">
          <img
            ref={imgRef}
            src={imageUrl}
            alt={title}
            onError={(e) => {
              if (!e.target.dataset.fallback) {
                e.target.src =
                  "https://dummyimage.com/600x600/eeeeee/888.png&text=Нет+фото";
                e.target.dataset.fallback = "1";
              }
            }}
          />
        </div>

        {/* ЦЕНТР: заголовок/мета/цена */}
        <div className="pc-list-center">
          <button
            className="pc-list-title"
            title={title}
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate();
            }}
          >
            {title}
          </button>

          <div className="pc-list-meta">
            <span>Артикул: {sku}</span>
            <span className="pc-dot">•</span>
            <span>Ед. изм.: {unit}</span>
          </div>

          <div className="pc-list-price">{price}</div>
        </div>

        {/* ПРАВО: количество / остаток / кнопка */}
        <div className="pc-list-right">
          <div className="pc-qty-col">
            <div className="pc-qty-label">Количество:</div>
            <div className="pc-qty-row">
              <button className="pc-qty-btn" onClick={dec} aria-label="−">
                −
              </button>
              {qtyInput}
              <button className="pc-qty-btn" onClick={inc} aria-label="+">
                +
              </button>
            </div>
          </div>

          <div
            className={
              stockNum > 0
                ? "pc-stock-badge pc-stock-green"
                : "pc-stock-badge pc-stock-red"
            }
          >
            {stockText}
          </div>

          <button
            className="pc-cart-btn pc-list-buy"
            onClick={handleAddToCart}
            disabled={stockNum <= 0}
          >
            Купить
          </button>
        </div>
      </div>
    );
  }

  // ===== GRID =====
  return (
    <div className="pc-card modern grid" style={colorVars} onClick={handleNavigate}>
      <div className="pc-thumb">
        <img
          ref={imgRef}
          src={imageUrl}
          alt={title}
          onError={(e) => {
            if (!e.target.dataset.fallback) {
              e.target.src =
                "https://dummyimage.com/600x600/eeeeee/888.png&text=Нет+фото";
              e.target.dataset.fallback = "1";
            }
          }}
        />
      </div>

      <div className="pc-info">
        <div className="pc-title" title={title}>
          {title}
        </div>
        <div className="pc-sku">Код: {sku}</div>

        <div className="pc-price">{price}</div>

        <div className={available ? "pc-stock-green center" : "pc-stock-red center"}>
          {available ? "В наличии" : "Нет в наличии"}
        </div>

        <div className="pc-qty-row center">
          <button className="pc-qty-btn" onClick={dec} aria-label="−">
            −
          </button>
          {qtyInput}
          <button className="pc-qty-btn" onClick={inc} aria-label="+">
            +
          </button>
        </div>

        <button className="pc-cart-btn" onClick={handleAddToCart} disabled={!available}>
          Купить
        </button>
      </div>
    </div>
  );
}

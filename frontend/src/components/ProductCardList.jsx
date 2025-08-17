import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useSite } from "../context/SiteContext";
import { triggerAddToCartFly } from "./AddToCartAnimation";
import { cartIconRef } from "./Header";
import "../assets/ProductCardList.css";

const API_URL =
  import.meta.env.VITE_API_URL || "https://truck-parts-backend.onrender.com";

export default function ProductCardList({ product }) {
  const navigate = useNavigate();
  const imgRef = useRef();
  const { addToCart } = useCart();
  const { display } = useSite();

  const [quantity, setQuantity] = useState(1);

  // Картинка
  let imageUrl = "https://dummyimage.com/600x600/eeeeee/888.png&text=Нет+фото";
  if (product?.images?.length) {
    imageUrl = product.images[0].startsWith("http")
      ? product.images[0]
      : API_URL.replace(/\/$/, "") + product.images[0];
  }

  const available  = product?.availability !== false;
  const title      = (product?.name || "Название товара").trim();
  const priceValue = typeof product?.price === "number" ? product.price : 0;
  const price      = `${priceValue.toFixed(2)} грн.`;
  const sku        = product?.sku || "—";

  const handleNavigate = () => navigate(`/product/${product?._id}`);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (imgRef.current && cartIconRef.current) {
      const fromRect = imgRef.current.getBoundingClientRect();
      const toRect   = cartIconRef.current.getBoundingClientRect();
      triggerAddToCartFly(imageUrl, fromRect, toRect);
    }
    addToCart(product, quantity);
  };

  const inc = (e) => { e.stopPropagation(); setQuantity(q => q + 1); };
  const dec = (e) => { e.stopPropagation(); setQuantity(q => (q > 1 ? q - 1 : 1)); };

  // Палитра
  const colorVars = {
    "--pc-primary":      display?.palette?.["primary"]      || "#2291ff",
    "--pc-primary-dark": display?.palette?.["primary-dark"] || "#1475c4",
    "--pc-title":        display?.palette?.title            || "#1c375a",
    "--pc-price":        display?.palette?.price || display?.palette?.accent || "#108a38",
    "--pc-ok":           "#19a24a",
    "--pc-danger":       "#e33d3d",
  };

  return (
    <div className="pcl-card" style={colorVars} onClick={handleNavigate}>
      {/* слева — фото */}
      <div className="pcl-thumb">
        <img
          ref={imgRef}
          src={imageUrl}
          alt={title}
          onError={(e) => {
            if (!e.target.dataset.fallback) {
              e.target.src = "https://dummyimage.com/600x600/eeeeee/888.png&text=Нет+фото";
              e.target.dataset.fallback = "1";
            }
          }}
        />
      </div>

      {/* центр — заголовок, артикул, цена */}
      <div className="pcl-center">
        <button
          className="pcl-title"
          title={title}
          onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
        >
          {title}
        </button>

        <div className="pcl-meta">
          <span>Артикул: {sku}</span>
        </div>

        <div className="pcl-price">{price}</div>
      </div>

      {/* справа — статус, количество, кнопка */}
      <div className="pcl-right">
        <div className={`pcl-status ${available ? "ok" : "no"}`}>
          {available ? "В наличии" : "Нет в наличии"}
        </div>

        <div className="pcl-qty-col">
          <div className="pcl-qty-row">
            <button className="pcl-qty-btn" onClick={dec} aria-label="−">−</button>
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
              className="pcl-qty-input"
            />
            <button className="pcl-qty-btn" onClick={inc} aria-label="+">+</button>
          </div>
        </div>

        <button
          className="pcl-buy"
          onClick={handleAddToCart}
          disabled={!available}
        >
          Купить
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

// --- Глобальный триггер
let globalTrigger;
export function triggerAddToCartFly(imgSrc, fromRect, toRect) {
  if (globalTrigger) globalTrigger(imgSrc, fromRect, toRect);
}

// --- Кастомные смещения для разных страниц (идеал)
function getPerfectOffsets(pathname) {
  // По умолчанию — главная и каталог
  let offsetX = -70, offsetY = -19;
  // Страница товара
  if (pathname.startsWith("/product/")) {
    offsetX = -120;
    offsetY = -50;
  }
  // Страница группы каталога
  if (pathname.startsWith("/catalog/group/")) {
    offsetX = -95;
    offsetY = -55;
  }
  return { offsetX, offsetY };
}

export default function AddToCartAnimation() {
  const [fly, setFly] = useState(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    globalTrigger = (imgSrc, fromRect, toRect) => {
      setFly({ imgSrc, fromRect, toRect, key: Date.now(), pathname: window.location.pathname });
      setAnimate(false);
    };
    return () => { globalTrigger = null; };
  }, []);

  useEffect(() => {
    if (!fly) return;
    setAnimate(false);
    const raf = requestAnimationFrame(() => setAnimate(true));
    const timer = setTimeout(() => setFly(null), 700);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [fly]);

  if (!fly) return null;

  const { imgSrc, fromRect, toRect, key, pathname } = fly;

  // --- Исправление для зума (масштаба) браузера
  const visualScale = window.visualViewport ? window.visualViewport.scale : 1;
  const scrollLeft = (window.scrollX || window.pageXOffset) * visualScale;
  const scrollTop = (window.scrollY || window.pageYOffset) * visualScale;

  // --- Кастомные смещения под страницу
  const { offsetX, offsetY } = getPerfectOffsets(pathname);

  let targetSize = 48, endLeft, endTop;
  if (toRect && typeof toRect.left === "number" && typeof toRect.top === "number") {
    targetSize = Math.max(toRect.width, 36);
    endLeft = toRect.left * visualScale + toRect.width * visualScale / 2 - targetSize / 2 + scrollLeft + offsetX;
    endTop = toRect.top * visualScale + toRect.height * visualScale / 2 - targetSize / 2 + scrollTop + offsetY;
  } else {
    endLeft = window.innerWidth - targetSize - 24;
    endTop = 24;
  }
  const startLeft = fromRect.left * visualScale + scrollLeft;
  const startTop = fromRect.top * visualScale + scrollTop;

  const styleBase = {
    position: "fixed",
    zIndex: 9999,
    left: startLeft,
    top: startTop,
    width: fromRect.width,
    height: fromRect.height,
    borderRadius: 12,
    pointerEvents: "none",
    boxShadow: "0 8px 36px #0070f329",
    opacity: 0.98,
    transition: animate
      ? "transform 0.7s cubic-bezier(.7,.01,.36,.98), width 0.7s, height 0.7s, opacity 0.7s"
      : "none",
    transform: animate
      ? `translate(${endLeft - startLeft}px,${endTop - startTop}px) scale(${targetSize / fromRect.width})`
      : "none",
  };

  return ReactDOM.createPortal(
    <img
      key={key}
      src={imgSrc}
      alt=""
      draggable={false}
      style={styleBase}
    />,
    document.body
  );
}

import React from "react";
import { Link, useLocation } from "react-router-dom";

// ancestors = массив [{ _id, name }]
// sku = если есть код товара, показать в конце жирным
export default function Breadcrumbs({ ancestors = [], sku }) {
  return (
    <nav className="breadcrumbs-root" aria-label="breadcrumbs">
      <Link to="/">Главная</Link>
      <span className="breadcrumbs-sep">/</span>
      <Link to="/catalog">Каталог</Link>
      {ancestors && ancestors.length > 0 && ancestors.map((g, idx) => {
        const isLast = idx === ancestors.length - 1;
        // Если последняя крошка и это страница товара — делаем ссылкой (sku)
        if (isLast && sku) {
          return (
            <React.Fragment key={g._id || idx}>
              <span className="breadcrumbs-sep">/</span>
              <Link to={`/catalog/group/${g._id}`}>{g.name}</Link>
            </React.Fragment>
          );
        }
        // Если последняя крошка и это страница группы — делаем жирным текстом (не ссылка)
        if (isLast && !sku) {
          return (
            <React.Fragment key={g._id || idx}>
              <span className="breadcrumbs-sep">/</span>
              <span className="breadcrumbs-current">{g.name}</span>
            </React.Fragment>
          );
        }
        // Все промежуточные крошки — всегда ссылки
        return (
          <React.Fragment key={g._id || idx}>
            <span className="breadcrumbs-sep">/</span>
            <Link to={`/catalog/group/${g._id}`}>{g.name}</Link>
          </React.Fragment>
        );
      })}
      {/* Если есть sku (страница товара) — выводим код товара жирным */}
      {sku && (
        <>
          <span className="breadcrumbs-sep">/</span>
          <span className="breadcrumbs-current">{sku}</span>
        </>
      )}
    </nav>
  );
}

import React from "react";

export default function StoreNotFound() {
  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: 560,
        width: "100%",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 12px 30px rgba(0,0,0,.06)",
        padding: 28,
        border: "1px solid #eef2f7",
        textAlign: "center"
      }}>
        <div style={{fontSize: 42, lineHeight: 1, marginBottom: 12}}>🔎</div>
        <h1 style={{fontSize: 22, margin: 0, color: "#0f172a"}}>Магазин не найден</h1>
        <p style={{color: "#556071", marginTop: 8, marginBottom: 18}}>
          Проверьте адрес или свяжитесь с владельцем магазина.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            height: 40,
            padding: "0 16px",
            borderRadius: 10,
            background: "var(--site-primary, #2291ff)",
            color: "#fff",
            border: "1px solid var(--site-primary-dark, #1275be)",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Обновить страницу
        </button>
      </div>
    </div>
  );
}

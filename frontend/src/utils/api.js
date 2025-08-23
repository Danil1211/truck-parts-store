const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/**
 * В проде (на домене storo-shop.com) X-Tenant-Id не нужен —
 * арендатора определяем по hostname в withTenant.
 */
function isProdHost() {
  return (
    typeof location !== "undefined" &&
    /\.storo-shop\.com$/.test(location.hostname)
  );
}

/**
 * Основная функция запроса. Используй во всех местах вместо fetch:
 *   const data = await api('/api/products')
 */
export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const tenantId = localStorage.getItem("tenantId");

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!isProdHost() && tenantId) headers.set("X-Tenant-Id", tenantId);

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // пустой ответ (204 и т.п.)
  }

  if (!res.ok) {
    const msg = payload?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return payload;
}

/* ===== Шорткаты ===== */
export const get = (path, opts = {}) =>
  api(path, { ...opts, method: "GET" });
export const del = (path, opts = {}) =>
  api(path, { ...opts, method: "DELETE" });
export const post = (path, body, opts = {}) =>
  api(path, { ...opts, method: "POST", body: JSON.stringify(body) });
export const put = (path, body, opts = {}) =>
  api(path, { ...opts, method: "PUT", body: JSON.stringify(body) });
export const patch = (path, body, opts = {}) =>
  api(path, { ...opts, method: "PATCH", body: JSON.stringify(body) });

/* ===== Контекст арендатора в dev ===== */
export function setTenantId(id) {
  if (id) localStorage.setItem("tenantId", id);
}
export function getTenantId() {
  return localStorage.getItem("tenantId");
}
export function clearTenantContext() {
  localStorage.removeItem("tenantId");
}

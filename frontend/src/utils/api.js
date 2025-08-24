// frontend/src/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || ""; // пусто = относительный /api

const api = axios.create({
  baseURL: API_URL || "",
  withCredentials: false,
});

// добавляем токен и tenantId во все запросы
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const tenantId = localStorage.getItem("tenantId");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  return config;
});

export default api;

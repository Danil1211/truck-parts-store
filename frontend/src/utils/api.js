// frontend/src/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://api.storo-shop.com";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false, // если нужно — можно true
});

// перехватчик: перед каждым запросом добавляем токен и tenantId
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const tenantId = localStorage.getItem("tenantId");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers["x-tenant-id"] = tenantId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

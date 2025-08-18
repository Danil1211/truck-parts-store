import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // dev-прокси берёт тот же URL, что и прод (удобно)
  const target = (env.VITE_API_URL || "https://truck-parts-backend.onrender.com").replace(/\/+$/,'');

  return defineConfig({
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target,          // напр. https://truck-parts-backend.onrender.com
          changeOrigin: true,
          secure: true,
        },
      },
    },
  });
};

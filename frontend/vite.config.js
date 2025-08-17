export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://truck-parts-backend.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
}

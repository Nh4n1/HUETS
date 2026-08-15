import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Code splitting strategy
    rollupOptions: {
      output: {
        // Tách Ant Design vào file riêng
        manualChunks: {
          'antd': ['antd'],
          'leaflet': ['leaflet', 'react-leaflet'],
          'vendor': ['react', 'react-dom', 'react-router', 'axios'],
        },
      },
    },
    // Tối ưu kích thước
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
    },
    // Giảm kích thước CSS
    cssMinify: true,
    // Source map chỉ khi cần debug
    sourcemap: false,
    // Tăng chunk size warning
    chunkSizeWarningLimit: 500,
  },
  // Tối ưu CSS module
  css: {
    postcss: true,
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'antd'
            }
            if (id.includes('leaflet')) {
              return 'leaflet'
            }
            if (
              id.includes('/react/')
              || id.includes('/react-dom/')
              || id.includes('/react-router')
              || id.includes('/axios/')
            ) {
              return 'vendor'
            }
          }
          return undefined
        },
      },
    },
    minify: true,
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 500,
  },
  css: {
    postcss: true,
  },
})
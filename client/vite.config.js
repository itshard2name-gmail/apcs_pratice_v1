import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// For v3, I don't need the tailwindcss plugin in vite config usually, just postcss.
// But wait, the previous tailwind init might have set up postcss.
// Let's stick to standard vite-vue config.

export default defineConfig({
  plugins: [vue()],
  server: {
    port: parseInt(process.env.APCS_PRATICE_FRONTEND_PORT) || 3010,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.APCS_PRATICE_BACKEND_PORT || 3011}`,
        changeOrigin: true,
      }
    }
  }
})

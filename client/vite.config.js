import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// For v3, I don't need the tailwindcss plugin in vite config usually, just postcss.
// But wait, the previous tailwind init might have set up postcss.
// Let's stick to standard vite-vue config.

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})

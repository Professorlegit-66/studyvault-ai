import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.js.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
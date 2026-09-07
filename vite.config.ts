import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const STRICT_CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://api-inference.huggingface.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";
const DEV_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://api-inference.huggingface.co ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self';";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    headers: {
      'Content-Security-Policy': DEV_CSP
    }
  },
  preview: {
    host: true,
    port: 4173,
    headers: {
      'Content-Security-Policy': STRICT_CSP
    }
  }
})

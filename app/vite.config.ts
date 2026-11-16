import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,svg}'] }, // padrão + fontes e favicon
      manifest: {
        name: 'Finanças Pessoais',
        short_name: 'Finanças',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '.',
        background_color: '#eef0f4',
        theme_color: '#1f3fbf',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node', setupFiles: ['./src/test-setup.ts'] },
})

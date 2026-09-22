import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Control de Gastos',
        short_name: 'Gastos',
        description: 'Gestor personal de finanzas',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: './',
        scope: './',
        lang: 'es-MX',
        icons: [
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,ico}'] },
    }),
  ],
})

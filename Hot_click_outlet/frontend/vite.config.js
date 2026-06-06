import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',     // muestra "nueva versión disponible" vs. actualización silenciosa
      injectRegister: null,       // lo hacemos manualmente en main.jsx
      manifest: {
        name: 'HOTCLICK Admin',
        short_name: 'HOTCLICK',
        description: 'Panel de administración HOTCLICK — POS, ventas, inventario',
        start_url: '/admin',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0f0f17',
        theme_color: '#ff4b12',
        lang: 'es-CR',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precachea assets con hash (JS/CSS/SVG/HTML)
        globPatterns: ['**/*.{js,css,html,svg}'],
        globIgnores: ['**/node_modules/**'],
        // Network First para llamadas API GET (catálogo, marcas)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/productos'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-productos',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 30 * 60, maxEntries: 50 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/marcas') ||
              url.pathname.startsWith('/api/categorias'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-catalog',
              expiration: { maxAgeSeconds: 60 * 60, maxEntries: 20 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: { maxAgeSeconds: 7 * 24 * 60 * 60, maxEntries: 200 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/img'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'hc-img-proxy',
              expiration: { maxAgeSeconds: 7 * 24 * 60 * 60, maxEntries: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        skipWaiting: false,     // esperar a que el usuario confirme la actualización
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,         // desactivado en dev para no interferir con hot-reload
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../src/main/resources/static',
    emptyOutDir: true,
    cssMinify: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/')) return 'vendor-react'
          if (id.includes('node_modules/@tanstack')) return 'vendor-query'
          if (id.includes('node_modules/zustand') || id.includes('node_modules/react-i18next') || id.includes('node_modules/i18next') || id.includes('node_modules/axios')) return 'vendor-misc'
        },
      },
    },
  },
})

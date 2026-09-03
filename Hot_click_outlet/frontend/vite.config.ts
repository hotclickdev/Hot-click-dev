import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

const directorioFrontend = path.dirname(fileURLToPath(import.meta.url))

function escapeHtmlAttr(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

/** Metas GSC/Bing (si hay token de build) y link al feed Merchant para crawlers. */
function injectSiteVerification() {
  return {
    name: 'site-verification-meta',
    transformIndexHtml(html: string) {
      const google = process.env.VITE_GOOGLE_SITE_VERIFICATION?.trim() ?? ''
      const bing = process.env.VITE_BING_SITE_VERIFICATION?.trim() ?? ''
      const tags = [
        google ? `    <meta name="google-site-verification" content="${escapeHtmlAttr(google)}" />` : '',
        bing ? `    <meta name="msvalidate.01" content="${escapeHtmlAttr(bing)}" />` : '',
        '    <link rel="alternate" type="application/rss+xml" title="Google Merchant Center" href="https://hotclick.lat/api/public/feed/shopping.xml" />',
      ].filter(Boolean).join('\n')
      return html.replace('    <!-- HC_SEO_BLOCK_END -->', `${tags}\n    <!-- HC_SEO_BLOCK_END -->`)
    },
  }
}

export default defineConfig({
  plugins: [
    injectSiteVerification(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'HotClick',
        short_name: 'HotClick',
        description: 'Marketplace costarricense — comprá y vendé en un solo lugar',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F8F9FB',
        theme_color: '#E73B33',
        lang: 'es-CR',
        icons: [
          { src: '/brand/app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: '/brand/app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png}', '*.svg'],
        globIgnores: ['**/node_modules/**', 'brand/**', 'admin/**'],
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
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/admin/ai'),
            handler: 'NetworkOnly',
            method: 'POST',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(directorioFrontend, './src'),
    },
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.jsx', '.js', '.json'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:8080',
        changeOrigin: true,
        secure: process.env.VITE_API_PROXY_INSECURE !== '1',
        timeout: 120_000,
        proxyTimeout: 120_000,
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
          if (id.includes('node_modules/@clerk')) return 'vendor-clerk'
          if (id.includes('node_modules/zustand') || id.includes('node_modules/react-i18next') || id.includes('node_modules/i18next') || id.includes('node_modules/axios')) return 'vendor-misc'
        },
      },
    },
  },
})

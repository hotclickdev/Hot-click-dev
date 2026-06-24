import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import * as Sentry from '@sentry/react'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
  })
}

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Registra el Service Worker. En producción muestra un toast de "nueva versión disponible"
// cuando hay una actualización; el usuario puede recargar en ese momento.
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      // Despacha un evento custom que App.jsx puede escuchar para mostrar el toast
      window.dispatchEvent(new CustomEvent('sw-update-available'))
    },
    onOfflineReady() {
      console.info('[SW] App lista para uso offline')
    },
    onRegistered(swRegistration) {
      if (swRegistration) {
        // Verificar actualizaciones cada hora en background
        setInterval(() => { swRegistration.update() }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.warn('[SW] Error al registrar Service Worker:', error)
    },
  })
}

// ClerkProvider se carga sólo cuando el usuario navega a rutas de auth
// (ver ClerkShell.jsx en App.jsx), no en el bundle inicial.
const AppRoot = <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>{AppRoot}</StrictMode>,
)

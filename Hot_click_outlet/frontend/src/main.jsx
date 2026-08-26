import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { PostHogProvider } from '@posthog/react'
import { initSentry, syncSentryUser } from '@/utils/sentryClient'
import useAuthStore from '@/store/authStore'

initSentry()
const sesion = useAuthStore.getState()
if (sesion.userId) {
  syncSentryUser({ userId: sesion.userId, empresaId: sesion.empresaId, rol: sesion.userRole })
}

const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: '2026-05-30',
}

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Registra el Service Worker. En producción muestra un toast de "nueva versión disponible"
// cuando hay una actualización; el usuario puede recargar en ese momento.
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      // Despacha un evento custom que App.jsx puede escuchar para mostrar el toast
      globalThis.dispatchEvent(new CustomEvent('sw-update-available'))
    },
    onOfflineReady() {},
    onRegistered(swRegistration) {
      if (swRegistration) {
        setInterval(() => { swRegistration.update() }, 60 * 60 * 1000)
      }
    },
    onRegisterError() {},
  })
}

// ClerkProvider se carga sólo cuando el usuario navega a rutas de auth
// (ver ClerkShell.jsx en App.jsx), no en el bundle inicial.
const AppRoot = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
  ? (
    <PostHogProvider apiKey={import.meta.env.VITE_POSTHOG_PROJECT_TOKEN} options={posthogOptions}>
      <App />
    </PostHogProvider>
  )
  : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>{AppRoot}</StrictMode>,
)

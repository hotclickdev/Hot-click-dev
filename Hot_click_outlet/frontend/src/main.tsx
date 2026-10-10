import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fuentes.css'
import './index.css'
import './i18n'
import App from './App'
import { registerSW } from 'virtual:pwa-register'
import { PostHogProvider } from '@posthog/react'
import { initSentry, syncSentryUser } from '@/utils/sentryClient'
import useAuthStore from '@/store/authStore'
import { debeAutoActualizar, registrarAplicarSwUpdate } from '@/app/swUpdate'

initSentry()
const sesion = useAuthStore.getState()
if (sesion.userId) {
  syncSentryUser({ userId: sesion.userId, empresaId: sesion.empresaId, rol: sesion.userRole })
}

const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: '2026-05-30' as const,
  opt_out_capturing_by_default: true,
}

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Visitante sin sesión en la vitrina: la versión nueva se aplica sola (si no, se quedaba con el diseño viejo).
      // Roles, POS/caja y formularios en curso siguen con el banner "Actualizar" (ver debeAutoActualizar).
      const haySesion = Boolean(useAuthStore.getState().token || useAuthStore.getState().userId)
      if (debeAutoActualizar(globalThis.location.pathname, haySesion)) {
        void updateSW(true)
        return
      }
      globalThis.dispatchEvent(new CustomEvent('sw-update-available'))
    },
    onOfflineReady() {},
    onRegistered(swRegistration) {
      if (swRegistration) {
        void swRegistration.update()
        setInterval(() => { void swRegistration.update() }, 60 * 60 * 1000)
        // Pestañas de larga duración (ej. caja POS abierta todo el día) no
        // esperan la hora completa: al volver a foco, chequean de una vez.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void swRegistration.update()
        })
      }
    },
    onRegisterError() {},
  })
  registrarAplicarSwUpdate((recargar = true) => updateSW(recargar))
}

const AppRoot = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
  ? (
    <PostHogProvider apiKey={import.meta.env.VITE_POSTHOG_PROJECT_TOKEN} options={posthogOptions}>
      <App />
    </PostHogProvider>
  )
  : <App />

const raiz = document.getElementById('root')
if (!raiz) {
  throw new Error('No se encontró #root')
}

createRoot(raiz).render(
  <StrictMode>{AppRoot}</StrictMode>,
)

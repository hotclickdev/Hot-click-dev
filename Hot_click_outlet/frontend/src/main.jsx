import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { ClerkProvider } from '@clerk/react'

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

const AppRoot = CLERK_KEY
  ? <ClerkProvider publishableKey={CLERK_KEY}><App /></ClerkProvider>
  : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>{AppRoot}</StrictMode>,
)

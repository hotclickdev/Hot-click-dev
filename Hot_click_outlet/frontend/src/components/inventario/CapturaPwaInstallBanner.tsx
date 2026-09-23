import { useState } from 'react'
import useAuthStore from '@/store/authStore'
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt'
import {
  esDispositivoAndroid,
  esDispositivoIos,
  esPwaStandalone,
} from '@/utils/pwaDisplay'

const SESSION_DISMISS_KEY = 'hc-captura-pwa-dismiss'

function leerDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function guardarDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, '1')
  } catch {
    /* noop */
  }
}

/**
 * Banner para instalar la PWA en modo captura (ADMIN, navegador, no standalone).
 */
export default function CapturaPwaInstallBanner() {
  const userRole = useAuthStore((s) => s.userRole)
  const { canInstall, instalar } = usePwaInstallPrompt()
  const [oculto, setOculto] = useState(leerDismissed)

  if (esPwaStandalone() || userRole !== 'ADMIN' || oculto) return null

  function cerrar() {
    guardarDismissed()
    setOculto(true)
  }

  const tipAndroid = 'Chrome: menú ⋮ → Instalar app / Añadir a pantalla de inicio'
  const tipIos = 'Compartir → Agregar a pantalla de inicio'

  let accionSecundaria: string | null = null
  if (!canInstall) {
    if (esDispositivoAndroid()) accionSecundaria = tipAndroid
    else if (esDispositivoIos()) accionSecundaria = tipIos
    else accionSecundaria = tipAndroid
  }

  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      style={{ backgroundColor: 'rgba(13,71,161,0.08)', border: '1px solid rgba(13,71,161,0.25)' }}
      role="region"
      aria-label="Instalar app de captura"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          Instalá la app para captura en campo
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
          {canInstall
            ? 'Pantalla completa, acceso rápido y mejor uso offline.'
            : accionSecundaria}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canInstall && (
          <button
            type="button"
            onClick={() => { void instalar() }}
            className="text-xs font-bold px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: 'var(--hc-accent)' }}
          >
            Instalar app
          </button>
        )}
        <button
          type="button"
          onClick={cerrar}
          className="text-xs font-semibold px-3 py-2 rounded-xl"
          style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}

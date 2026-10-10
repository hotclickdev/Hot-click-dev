import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import useChatStore from '@/store/chatStore'
import { abrirAccesibilidad } from './accessibility/abrirAccesibilidadApi'
import { esFichaProducto } from './flotantes/flotantesHelpers'
import { useHayBarraInferior } from './flotantes/barraInferiorStore'

/**
 * Botón flotante de accesibilidad: abre la hoja «Idioma y accesibilidad» desde cualquier pantalla
 * (antes solo desde el pie). 44 × 44, sobre el de WhatsApp con 12 px de separación.
 */
export default function AccesibilidadFab() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const chatOpen = useChatStore((s) => s.isOpen)
  const hayBarra = useHayBarraInferior()
  if (chatOpen) return null

  // WhatsApp ocupa 56 px desde 83 px (con barra) o 16 px; este va 12 px más arriba y centrado (6 px).
  const bottomMovil = hayBarra
    ? 'bottom-[calc(151px+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[calc(84px+env(safe-area-inset-bottom,0px))]'
  const label = t('common.accesibilidadAbrir')

  return (
    <button
      type="button"
      onClick={abrirAccesibilidad}
      aria-label={label}
      title={label}
      className={`fixed right-[22px] z-40 flex size-11 items-center justify-center rounded-full border border-hc-n-200 bg-hc-n-0 text-hc-blue-600 shadow-md transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-blue-600 ${bottomMovil} lg:bottom-[84px] ${esFichaProducto(pathname) ? 'max-lg:hidden' : ''}`}
    >
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="4.5" r="1.8" fill="currentColor" stroke="none" />
        <path d="M5 8.5c2.3.7 4.6 1 7 1s4.7-.3 7-1" />
        <path d="M12 9.5v5" />
        <path d="M12 14.5l-3 6" />
        <path d="M12 14.5l3 6" />
      </svg>
    </button>
  )
}

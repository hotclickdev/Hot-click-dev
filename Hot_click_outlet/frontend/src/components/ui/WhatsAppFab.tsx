import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import useChatStore from '@/store/chatStore'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'
import { esFichaProducto } from './flotantes/flotantesHelpers'
import { useHayBarraInferior } from './flotantes/barraInferiorStore'

const WHATSAPP = '50686667888'

/**
 * Botón flotante de WhatsApp (Figma `52:2418`, nota F: "sobre la barra inferior (móvil) y abajo a la
 * derecha (desktop)"). 56 × 56, verde de WhatsApp con su sombra, a 16 px del borde derecho.
 * Con barra inferior queda a 16 px sobre ella (83 px). Sin barra, a 16 px del borde: el offset de
 * la barra no se aplica. Desktop no cambia (`lg:bottom-4`). En la ficha móvil se oculta.
 * R5 (2-oct-2026): mientras el botón está montado, `html.hc-con-fab` agrega en móvil un
 * `scroll-padding-bottom` del alto que ocupa (barra + botón + márgenes): una tarjeta que recibe foco
 * o a la que se salta no queda debajo. El hueco al final de la página lo pone `MainLayout`.
 */
export default function WhatsAppFab() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const chatOpen = useChatStore((s) => s.isOpen)
  const hayBarra = useHayBarraInferior()
  const visible = !chatOpen
  useEffect(() => {
    if (!visible) return
    const html = document.documentElement
    html.classList.add('hc-con-fab')
    return () => html.classList.remove('hc-con-fab')
  }, [visible])
  if (!visible) return null

  const label = t('common.whatsappConsult')
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t('common.whatsappGreeting'))}`
  const bottomMovil = hayBarra
    ? 'bottom-[calc(83px+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[calc(16px+env(safe-area-inset-bottom,0px))]'

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`fixed right-4 z-40 block size-14 rounded-full transition-transform active:scale-95 ${bottomMovil} lg:bottom-4 ${esFichaProducto(pathname) ? 'max-lg:hidden' : ''}`}
    >
      {/* El SVG de Figma (80 × 80) incluye la sombra: 12 px a cada lado, 8 arriba y 16 abajo. */}
      <img
        src={ICONOS_ESTADOS.whatsappFlotante}
        alt=""
        width={80}
        height={80}
        className="pointer-events-none absolute -left-3 -top-2 max-w-none"
      />
    </a>
  )
}

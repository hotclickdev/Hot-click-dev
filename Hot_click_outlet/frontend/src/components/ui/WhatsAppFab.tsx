import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import useChatStore from '@/store/chatStore'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'
import { esFichaProducto } from './flotantes/flotantesHelpers'

const WHATSAPP = '50686667888'

/**
 * Botón flotante de WhatsApp (Figma `52:2418`, nota F: "sobre la barra inferior (móvil) y abajo a la
 * derecha (desktop)"). 56 × 56, verde de WhatsApp con su sombra, a 16 px del borde derecho y a 16 px
 * sobre la barra inferior de 67 px. En la ficha de producto móvil se oculta: ahí está la barra de
 * compra y la ficha ya trae su propio botón "Hacer una pregunta por WhatsApp".
 */
export default function WhatsAppFab() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const chatOpen = useChatStore((s) => s.isOpen)
  if (chatOpen) return null

  const label = t('common.whatsappConsult')
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t('common.whatsappGreeting'))}`

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`fixed right-4 z-40 block size-14 rounded-full transition-transform active:scale-95 bottom-[calc(83px+env(safe-area-inset-bottom,0px))] lg:bottom-4 ${esFichaProducto(pathname) ? 'max-lg:hidden' : ''}`}
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

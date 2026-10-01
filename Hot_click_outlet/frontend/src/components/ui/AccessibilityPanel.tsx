import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { esRutaClaudeclick } from '@/utils/rutaPrototipo'
import { HotClickMark } from '@/components/ui/BrandLogo'
import useChatStore from '@/store/chatStore'
import HojaIdiomaAccesibilidad from './accessibility/HojaIdiomaAccesibilidad'
import { EVENTO_ABRIR_ACCESIBILIDAD } from './accessibility/abrirAccesibilidadApi'
import { esFichaProducto } from './flotantes/flotantesHelpers'

/**
 * Se queda como botón flotante hasta que el pie de página y Mi cuenta abran la hoja con
 * `abrirAccesibilidad()` (Figma 51:2590, nota E). Cuando eso exista, poner a `false`.
 */
const MOSTRAR_BOTON_FLOTANTE = true

/**
 * Host de la hoja "Idioma y accesibilidad" (Figma `51:2234`) y botón flotante con el isotipo.
 * El botón va sobre el de WhatsApp (móvil: encima de la barra inferior) y se oculta en la ficha de
 * producto móvil, donde la barra de compra ocupa ese borde.
 */
export default function AccessibilityPanel() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const chatOpen = useChatStore((s) => s.isOpen)

  useEffect(() => {
    const abrir = () => setOpen(true)
    globalThis.addEventListener(EVENTO_ABRIR_ACCESIBILIDAD, abrir)
    return () => globalThis.removeEventListener(EVENTO_ABRIR_ACCESIBILIDAD, abrir)
  }, [])

  // El widget es para clientes de la tienda; en admin, tienda del vendedor y prototipo no aparece.
  if (pathname.startsWith('/checkout') || pathname.startsWith('/pago')) return null
  if (pathname.startsWith('/admin')) return null
  if (pathname.startsWith('/tienda')) return null
  if (esRutaClaudeclick(pathname)) return null
  if (chatOpen) return null

  const cerrar = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      {MOSTRAR_BOTON_FLOTANTE && (
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen(true)}
          aria-label={t('a11y.open')}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={t('a11y.hojaTitulo')}
          className={`hc-isotipo-placa fixed right-5 z-40 flex size-12 items-center justify-center rounded-2xl border border-hc-n-200 shadow-[0_4px_20px_var(--hc-shadow)] transition-transform hover:scale-110 active:scale-95 bottom-[calc(151px+env(safe-area-inset-bottom,0px))] lg:bottom-[84px] ${esFichaProducto(pathname) ? 'max-lg:hidden' : ''}`}
        >
          <HotClickMark size={24} />
        </button>
      )}
      <HojaIdiomaAccesibilidad abierta={open} onCerrar={cerrar} />
    </>
  )
}

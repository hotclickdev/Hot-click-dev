import { useEffect, useRef, useState } from 'react'
import HojaIdiomaAccesibilidad from './accessibility/HojaIdiomaAccesibilidad'
import { EVENTO_ABRIR_ACCESIBILIDAD } from './accessibility/abrirAccesibilidadApi'

/**
 * Host de la hoja "Idioma y accesibilidad" (Figma `51:2234`). La abre `abrirAccesibilidad()` desde el
 * pie de página (nota E de Figma: "desde el pie"); ya no hay botón flotante con el isotipo, que ningún
 * frame dibuja. Al cerrar, el foco vuelve a quien la abrió.
 */
export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false)
  const quienAbrio = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const abrir = () => {
      quienAbrio.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setOpen(true)
    }
    globalThis.addEventListener(EVENTO_ABRIR_ACCESIBILIDAD, abrir)
    return () => globalThis.removeEventListener(EVENTO_ABRIR_ACCESIBILIDAD, abrir)
  }, [])

  const cerrar = () => {
    setOpen(false)
    quienAbrio.current?.focus()
  }

  return <HojaIdiomaAccesibilidad abierta={open} onCerrar={cerrar} />
}

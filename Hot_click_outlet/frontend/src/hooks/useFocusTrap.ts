import { useEffect, type RefObject } from 'react'

const SELECTOR_FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Atrapa el foco de teclado dentro de `ref` mientras `active` es true; restaura el foco previo al cerrar. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const previoActivo = document.activeElement as HTMLElement | null
    const nodo = ref.current
    const primero = nodo?.querySelector<HTMLElement>(SELECTOR_FOCUSABLE)
    ;(primero ?? nodo)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !nodo) return
      const focoables = Array.from(nodo.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABLE))
      if (focoables.length === 0) return
      const primero = focoables[0]
      const ultimo = focoables[focoables.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previoActivo?.focus()
    }
  }, [active, ref])
}

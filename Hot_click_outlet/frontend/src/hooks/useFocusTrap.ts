import { useEffect, type RefObject } from 'react'
import { destinoTab } from './focoAtrapado'

const SELECTOR_FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dónde queda el foco al abrir: en el primer control, en el propio contenedor (que debe tener
 * `tabIndex={-1}`) o donde lo ponga quien usa el hook.
 */
export type FocoInicial = 'primero' | 'contenedor' | 'ninguno'

/** Controles a los que llega Tab: sin `tabIndex` negativo y dibujados (no dentro de un `display: none`). */
function focoables(nodo: HTMLElement): HTMLElement[] {
  return Array.from(nodo.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABLE))
    .filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0)
}

/**
 * Atrapa el foco de teclado dentro de `ref` mientras `active` es true: Tab y Mayús+Tab dan la vuelta
 * dentro del diálogo. Al cerrar devuelve el foco al control que lo tenía, si sigue en la página.
 * El contenedor se lee en cada tecla porque algunas hojas se vuelven a montar al cambiar de ancho.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, focoInicial: FocoInicial = 'primero') {
  useEffect(() => {
    if (!active) return undefined
    const previoActivo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const nodo = ref.current
    if (nodo && focoInicial !== 'ninguno') {
      const destino = focoInicial === 'primero' ? focoables(nodo)[0] ?? nodo : nodo
      destino.focus({ preventScroll: true })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const actual = ref.current
      if (e.key !== 'Tab' || !actual) return
      const lista = focoables(actual)
      const activo = document.activeElement
      let indice = -1
      if (activo instanceof HTMLElement && activo !== actual && actual.contains(activo)) {
        indice = lista.indexOf(activo)
        // Un elemento enfocado que no está en la lista (p. ej. tabIndex -1): el navegador decide.
        if (indice === -1) return
      }
      const destino = destinoTab(lista.length, indice, e.shiftKey)
      if (destino === null) return
      e.preventDefault()
      lista[destino].focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previoActivo?.isConnected) previoActivo.focus({ preventScroll: true })
    }
  }, [active, ref, focoInicial])
}

import { useEffect } from 'react'

function sinModificador(event: KeyboardEvent) {
  return !event.ctrlKey && !event.altKey && !event.metaKey
}

function enfocarBusqueda() {
  document.querySelector<HTMLInputElement>('[data-pos-search]')?.focus()
}

function enfocarCantidad() {
  const cantidades = document.querySelectorAll<HTMLInputElement>('[data-pos-qty]')
  const ultimo = cantidades[cantidades.length - 1]
  if (ultimo) ultimo.focus()
  else enfocarBusqueda()
}

/**
 * Atajos de caja: F2 buscar, F4 cantidad del último ítem, F8 cobrar.
 * F8 llama el mismo onCobrar del botón; no confirma el pago.
 */
export function usePosAtajos({ activo, hayItems, onCobrar, alBuscar, alCantidad }: {
  activo: boolean
  hayItems: boolean
  onCobrar: () => void
  alBuscar?: () => void
  alCantidad?: () => void
}) {
  useEffect(() => {
    if (!activo) return

    function onKey(event: KeyboardEvent) {
      if (!sinModificador(event)) return
      if (event.key === 'F2') {
        event.preventDefault()
        alBuscar?.()
        setTimeout(enfocarBusqueda, 0)
        return
      }
      if (event.key === 'F4') {
        event.preventDefault()
        alCantidad?.()
        setTimeout(enfocarCantidad, 0)
        return
      }
      if (event.key === 'F8' && hayItems) {
        event.preventDefault()
        onCobrar()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activo, hayItems, onCobrar, alBuscar, alCantidad])
}

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
 * F8 llama el mismo onCobrar del botón; no confirma el pago. onCobrar
 * decide qué hacer con carrito vacío (toast), F8 ya no lo filtra en
 * silencio para que el cajero reciba el mismo feedback que con el botón.
 */
export function usePosAtajos({ activo, onCobrar, alBuscar, alCantidad }: {
  activo: boolean
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
        setTimeout(enfocarCantidad, 50)
        return
      }
      if (event.key === 'F8') {
        event.preventDefault()
        onCobrar()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activo, onCobrar, alBuscar, alCantidad])
}

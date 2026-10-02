import { useSyncExternalStore } from 'react'

/** Hasta que monta el layout, se asume barra: es la posición de Home y la que ya tenía el botón. */
let hayBarraInferior = true
const oyentes = new Set<() => void>()

function emitir() {
  oyentes.forEach((oyente) => oyente())
}

/** La publica `MainLayout`: el FAB está fuera del layout y no puede leer la prop. */
export function publicarBarraInferior(visible: boolean) {
  if (hayBarraInferior === visible) return
  hayBarraInferior = visible
  emitir()
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function leerBarraInferior() {
  return hayBarraInferior
}

export function useHayBarraInferior() {
  return useSyncExternalStore(suscribir, leerBarraInferior, () => true)
}

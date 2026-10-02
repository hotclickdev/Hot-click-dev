import { useSyncExternalStore } from 'react'

/**
 * `PantallaSinConexion` se muestra en `/sin-conexion` y también en `/` cuando Home no tiene datos.
 * El FAB vive fuera de la página, así que la ruta `/` sola no distingue el Home normal.
 */
let activas = 0
const oyentes = new Set<() => void>()

function emitir() {
  oyentes.forEach((oyente) => oyente())
}

/** Suma una pantalla montada y devuelve la función que la suelta. */
export function retenerPantallaSinConexion(): () => void {
  activas += 1
  emitir()
  return () => {
    activas = Math.max(0, activas - 1)
    emitir()
  }
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function leerPantallaSinConexion() {
  return activas > 0
}

export function usePantallaSinConexion() {
  return useSyncExternalStore(suscribir, leerPantallaSinConexion, () => false)
}

import { useRef } from 'react'
import type { DireccionPaso } from './formularioMotionTokens'

/** Compara el índice actual con el anterior para saber si el usuario avanzó o retrocedió. */
export function useDireccionPaso(pasoActual: number): DireccionPaso {
  const previo = useRef(pasoActual)
  const direccion: DireccionPaso = pasoActual < previo.current ? 'back' : 'forward'
  previo.current = pasoActual
  return direccion
}

export function direccionDesdeIndices(anterior: number, actual: number): DireccionPaso {
  return actual < anterior ? 'back' : 'forward'
}

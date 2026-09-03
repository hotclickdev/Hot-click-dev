/** Tokens de motion para wizards vendedor. Solo transform/opacity — sin linear. */

export const DURACION_ENTRADA_S = 0.28
export const DURACION_SALIDA_S = 0.22
export const DURACION_COLOR_S = 0.2
export const DURACION_CONECTOR_S = 0.4
export const DURACION_CONECTOR_ATRAS_S = 0.25
export const DURACION_REDUCED_S = 0.15
export const DELAY_SELECCION_MS = 150
export const DESPLAZAMIENTO_PASO_PX = 28

/** ease-out (entradas) */
export const EASE_ENTRADA: [number, number, number, number] = [0, 0, 0.2, 1]
/** ease-in (salidas) */
export const EASE_SALIDA: [number, number, number, number] = [0.4, 0, 1, 1]
/** Elástico suave premium (stepper / pop) */
export const EASE_PREMIUM: [number, number, number, number] = [0.25, 1, 0.5, 1]

export type DireccionPaso = 'forward' | 'back'

export function variantesPaso(direccion: DireccionPaso, reduced: boolean) {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: DURACION_REDUCED_S } },
      exit: { opacity: 0, transition: { duration: DURACION_REDUCED_S } },
    }
  }
  const entraDesde = direccion === 'forward' ? DESPLAZAMIENTO_PASO_PX : -DESPLAZAMIENTO_PASO_PX
  const saleHacia = direccion === 'forward' ? -DESPLAZAMIENTO_PASO_PX : DESPLAZAMIENTO_PASO_PX
  return {
    initial: { opacity: 0, x: entraDesde },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: DURACION_ENTRADA_S, ease: EASE_ENTRADA },
    },
    exit: {
      opacity: 0,
      x: saleHacia,
      transition: { duration: DURACION_SALIDA_S, ease: EASE_SALIDA },
    },
  }
}

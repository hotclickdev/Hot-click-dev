/** Tokens de motion para wizards vendedor. Transform/opacity — sin linear. */

export const DURACION_ENTRADA_S = 0.42
export const DURACION_SALIDA_S = 0.28
export const DURACION_COLOR_S = 0.28
export const DURACION_CONECTOR_S = 0.5
export const DURACION_CONECTOR_ATRAS_S = 0.32
export const DURACION_REDUCED_S = 0.15
export const DELAY_SELECCION_MS = 180
export const DESPLAZAMIENTO_PASO_PX = 48

/** Stagger de hijos dentro de un paso / lista */
export const STAGGER_HIJOS_S = 0.09
export const DELAY_HIJOS_S = 0.08
export const DESPLAZAMIENTO_ITEM_PX = 18

/** Spring suave para entradas de paso / pop */
export const SPRING_ENTRADA = { type: 'spring' as const, stiffness: 320, damping: 28, mass: 0.85 }
export const SPRING_POP = { type: 'spring' as const, stiffness: 420, damping: 22, mass: 0.7 }

/** ease-out (entradas CSS / color) */
export const EASE_ENTRADA: [number, number, number, number] = [0.16, 1, 0.3, 1]
/** ease-in (salidas) */
export const EASE_SALIDA: [number, number, number, number] = [0.4, 0, 1, 1]
/** Elástico suave premium (fallback cubic cuando no hay spring) */
export const EASE_PREMIUM: [number, number, number, number] = [0.22, 1.2, 0.36, 1]

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
      transition: SPRING_ENTRADA,
    },
    exit: {
      opacity: 0,
      x: saleHacia,
      transition: { duration: DURACION_SALIDA_S, ease: EASE_SALIDA },
    },
  }
}

/** Variantes para stagger de campos/opciones dentro del paso */
export function variantesHijosPaso(reduced: boolean) {
  if (reduced) {
    return {
      oculto: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: DURACION_REDUCED_S } },
    }
  }
  return {
    oculto: { opacity: 0, y: DESPLAZAMIENTO_ITEM_PX },
    visible: {
      opacity: 1,
      y: 0,
      transition: SPRING_ENTRADA,
    },
  }
}

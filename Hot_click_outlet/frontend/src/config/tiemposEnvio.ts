/**
 * Tiempos de entrega: ÚNICA FUENTE para `/envios`, las opciones del checkout y los textos i18n
 * (decisión D13, 2-oct-2026).
 *
 * ⚠ VALORES PROVISIONALES — confirmar con el negocio. Son los que ya usaba la operación.
 * Figma `28:1660` proponía «24 h hábiles» (rápido) y «1 a 3 días» (normal).
 * Para cambiarlos, editar solo este objeto: los textos de es/en/pt los leen por interpolación
 * (`{{envioRapidoDesde}}`, etc., registrados como `defaultVariables` en `i18n/index.ts`).
 */
export const TIEMPOS_ENVIO = {
  /** Envío rápido (express) dentro del GAM, en minutos y horas. */
  rapido: { desdeMin: 30, hastaHoras: 2 },
  /** Envío normal dentro del GAM, en días hábiles. */
  normalGam: { desdeDias: 2, hastaDias: 4 },
  /** Envío normal fuera del GAM, en días hábiles. */
  fueraGam: { desdeDias: 3, hastaDias: 4 },
} as const

export const TIEMPOS_ENVIO_PROVISIONALES = true

/** Variables de interpolación para i18next (mismas en los tres idiomas). */
export function variablesTiemposEnvio(): Record<string, number> {
  return {
    envioRapidoDesde: TIEMPOS_ENVIO.rapido.desdeMin,
    envioRapidoHasta: TIEMPOS_ENVIO.rapido.hastaHoras,
    envioNormalDesde: TIEMPOS_ENVIO.normalGam.desdeDias,
    envioNormalHasta: TIEMPOS_ENVIO.normalGam.hastaDias,
    envioFueraDesde: TIEMPOS_ENVIO.fueraGam.desdeDias,
    envioFueraHasta: TIEMPOS_ENVIO.fueraGam.hastaDias,
  }
}

/** Textos en español para el contenido que no pasa por i18n (`enviosData`, opciones del checkout). */
export const TEXTO_TIEMPO_ENVIO = {
  rapido: `${TIEMPOS_ENVIO.rapido.desdeMin} min – ${TIEMPOS_ENVIO.rapido.hastaHoras} horas`,
  normalGam: `${TIEMPOS_ENVIO.normalGam.desdeDias}–${TIEMPOS_ENVIO.normalGam.hastaDias} días hábiles`,
  fueraGam: `${TIEMPOS_ENVIO.fueraGam.desdeDias}–${TIEMPOS_ENVIO.fueraGam.hastaDias} días hábiles`,
} as const

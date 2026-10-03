import tiempos from '../../../src/main/resources/config/tiempos-envio.json'

/**
 * Tiempos de entrega (decisión D13, 2-oct-2026). La ÚNICA FUENTE es
 * `Hot_click_outlet/src/main/resources/config/tiempos-envio.json`: la leen este módulo
 * (`/envios`, opciones del checkout y textos i18n) y el backend (`com.hotclick.config.TiemposEnvio`,
 * correo de guía). Vive en `src/main/resources` porque el build del backend solo copia `src/`.
 *
 * Valores CONFIRMADOS por el negocio el 2-oct-2026 (son los que ya usaba la operación).
 * Figma `28:1660` proponía «24 h hábiles» (rápido) y «1 a 3 días» (normal).
 * Para cambiarlos, editar solo el JSON: los textos de es/en/pt los leen por interpolación
 * (`{{envioRapidoDesde}}`, etc., registrados como `defaultVariables` en `i18n/index.ts`).
 */
export const TIEMPOS_ENVIO = {
  /** Envío rápido (express) dentro del GAM, en minutos y horas. */
  rapido: tiempos.rapido,
  /** Envío normal dentro del GAM, en días hábiles. */
  normalGam: tiempos.normalGam,
  /** Envío normal fuera del GAM, en días hábiles. */
  fueraGam: tiempos.fueraGam,
} as const

export const TIEMPOS_ENVIO_PROVISIONALES = tiempos.provisional

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

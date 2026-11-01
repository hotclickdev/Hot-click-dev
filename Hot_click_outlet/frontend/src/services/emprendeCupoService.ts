import api from './api'

export type CupoEmprende = {
  usados: number
  limite: number
  cuposGratisDisponibles: number
  /** Duración del trial en palabras, derivada de TRIAL_EMPRENDEDOR_DIAS (p. ej. «3 meses»). */
  periodoGratis?: string | null
  /** Mensualidad USD de Emprendedor sin cupo, desde config del backend; null si no está fijada. */
  mensualidadUsdSinCupo?: number | null
}

export const emprendeCupoService = {
  get: () => api.get<CupoEmprende>('/public/emprende/cupos'),
}

/** Estado del plan de un negocio que pidió cupo Emprendedor y espera aprobación (#419). Sin trial ni cobro todavía. */
export const ESTADO_PLAN_PENDIENTE_CUPO = 'PENDIENTE_CUPO'

/** true si el negocio está esperando que le aprueben el cupo: aún no tiene días de trial ni puede agregar tarjeta. */
export function esperandoCupo(estadoPlan: string | null | undefined): boolean {
  return estadoPlan === ESTADO_PLAN_PENDIENTE_CUPO
}

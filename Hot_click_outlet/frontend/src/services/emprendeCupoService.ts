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

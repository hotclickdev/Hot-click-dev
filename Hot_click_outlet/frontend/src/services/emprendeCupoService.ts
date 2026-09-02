import api from './api'

export type CupoEmprende = {
  usados: number
  limite: number
  cuposGratisDisponibles: number
}

export const emprendeCupoService = {
  get: () => api.get<CupoEmprende>('/public/emprende/cupos'),
}

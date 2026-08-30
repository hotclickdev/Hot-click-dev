import api from './api'

/** Consulta de contribuyente en Hacienda CR. */
export const haciendaService = {
  getContribuyente: (cedula: string) => api.get(`/hacienda/contribuyente/${cedula}`),
}

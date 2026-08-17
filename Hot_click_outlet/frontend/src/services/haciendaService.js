import api from './api'

/** Consulta de contribuyente en Hacienda CR. */
export const haciendaService = {
  getContribuyente: (cedula) => api.get(`/hacienda/contribuyente/${cedula}`),
}

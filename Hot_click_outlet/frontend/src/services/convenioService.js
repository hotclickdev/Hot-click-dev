import api from './api'

/** Lista de convenios desde axios, con o sin unwrap de ResponseDTO. */
export function listaConvenios(respuesta) {
  const payload = respuesta?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

/** Convenios: listado público (sin auth) y CRUD admin. */
export const convenioService = {
  getPublicos: () => api.get('/convenios/publicos'),
  getAll: () => api.get('/convenios'),
  create: (data) => api.post('/convenios', data),
  update: (id, data) => api.put(`/convenios/${id}`, data),
  delete: (id) => api.delete(`/convenios/${id}`),
}


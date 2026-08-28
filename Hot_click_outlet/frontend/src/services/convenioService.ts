import api from './api'
import type { Id, JsonBody } from '@/types/api'

/** Lista de convenios desde axios, con o sin unwrap de ResponseDTO. */
export function listaConvenios(respuesta: { data?: unknown } | undefined) {
  const payload = respuesta?.data as { data?: unknown } | unknown[] | undefined
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

/** Convenios: listado público (sin auth) y CRUD admin. */
export const convenioService = {
  getPublicos: () => api.get('/convenios/publicos'),
  getAll: () => api.get('/convenios'),
  create: (data: JsonBody) => api.post('/convenios', data),
  update: (id: Id, data: JsonBody) => api.put(`/convenios/${id}`, data),
  delete: (id: Id) => api.delete(`/convenios/${id}`),
}

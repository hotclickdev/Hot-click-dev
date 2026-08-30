import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const gastoService = {
  listar:    (desde?: string, hasta?: string) => api.get('/gastos', { params: { desde, hasta } }).then(r => r.data?.data ?? r.data ?? []),
  crear:     (dto: JsonBody)          => api.post('/gastos', dto).then(r => r.data),
  actualizar:(id: Id, dto: JsonBody)      => api.put(`/gastos/${id}`, dto).then(r => r.data),
  eliminar:  (id: Id)           => api.delete(`/gastos/${id}`).then(r => r.data),
}

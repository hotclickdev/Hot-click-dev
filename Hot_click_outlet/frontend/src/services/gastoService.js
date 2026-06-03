import api from './api'

export const gastoService = {
  listar:    (desde, hasta) => api.get('/gastos', { params: { desde, hasta } }).then(r => r.data?.data ?? r.data ?? []),
  crear:     (dto)          => api.post('/gastos', dto).then(r => r.data),
  actualizar:(id, dto)      => api.put(`/gastos/${id}`, dto).then(r => r.data),
  eliminar:  (id)           => api.delete(`/gastos/${id}`).then(r => r.data),
}

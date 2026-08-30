import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const giftCardService = {
  /** Returns { valida, saldoActual, codigo, fechaVencimiento, mensaje } */
  validar: (codigo: string) => api.get(`/gift-cards/validar?codigo=${encodeURIComponent(codigo)}`),

  listar: ()                                  => api.get('/admin/gift-cards'),
  crear:  (body: JsonBody)                              => api.post('/admin/gift-cards', body),
  cancelar: (id: Id)                              => api.delete(`/admin/gift-cards/${id}`),
}

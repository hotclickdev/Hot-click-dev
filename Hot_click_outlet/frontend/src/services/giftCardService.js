import api from './api'

export const giftCardService = {
  /** Returns { valida, saldoActual, codigo, fechaVencimiento, mensaje } */
  validar: (codigo) => api.get(`/gift-cards/validar?codigo=${encodeURIComponent(codigo)}`),

  listar: ()                                  => api.get('/admin/gift-cards'),
  crear:  (body)                              => api.post('/admin/gift-cards', body),
  cancelar: (id)                              => api.delete(`/admin/gift-cards/${id}`),
}

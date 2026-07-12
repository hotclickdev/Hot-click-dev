import api from './api'

export const soporteService = {
  subirFoto: (formData) =>
    api.post('/soporte/tickets/fotos', formData, { headers: { 'Content-Type': undefined } }),

  crearTicket: ({ titulo, descripcion, fotoUrl }) =>
    api.post('/soporte/tickets', { titulo, descripcion, fotoUrl }),
}

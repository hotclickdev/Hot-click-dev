import api from './api'

export const soporteService = {
  subirFoto: (formData: FormData) =>
    api.post('/soporte/tickets/fotos', formData, { headers: { 'Content-Type': undefined } }),

  crearTicket: ({ titulo, descripcion, fotoUrl }: { titulo: string, descripcion: string, fotoUrl?: string }) =>
    api.post('/soporte/tickets', { titulo, descripcion, fotoUrl }),
}

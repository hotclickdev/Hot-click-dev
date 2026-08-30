import api from './api'
import type { Id } from '@/types/api'

export const publicacionService = {
  analizar: (formData: FormData) =>
    api.post('/extraccion/analizar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    }),

  detallesProducto: (formData: FormData) =>
    api.post('/extraccion/detalles-producto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 20000,
    }),

  getTipoCambio: () =>
    api.get('/extraccion/tipo-cambio'),

  buscarPorNombre: (nombre: string, productoId: Id) =>
    api.post('/extraccion/buscar', { nombre, productoId: productoId || null }),

  listar: (estado?: string) =>
    api.get('/publicaciones-fb', { params: estado ? { estado } : {} }),

  generar: (productoId: Id, notasAdmin?: string) =>
    api.post(`/publicaciones-fb/${productoId}`, notasAdmin ? { notasAdmin } : {}),

  marcarPublicado: (id: Id) =>
    api.put(`/publicaciones-fb/${id}/publicado`),

  eliminar: (id: Id) =>
    api.delete(`/publicaciones-fb/${id}`),
}

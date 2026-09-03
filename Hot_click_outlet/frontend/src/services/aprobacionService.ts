import api from './api'
import type { Id } from '@/types/api'

/** Solicitudes de aprobación (empresas, productos, ofertas). */
export const aprobacionService = {
  listEmpresas: () => api.get('/admin/solicitudes-aprobacion'),
  aprobarEmpresa: (id: Id) => api.put(`/admin/solicitudes-aprobacion/${id}/aprobar`),
  rechazarEmpresa: (id: Id, comentario?: string) =>
    api.put(`/admin/solicitudes-aprobacion/${id}/rechazar`, { comentario: comentario || '' }),

  listProductos: () => api.get('/admin/solicitudes-aprobacion/productos'),
  aprobarProducto: (id: Id) => api.put(`/admin/solicitudes-aprobacion/productos/${id}/aprobar`),
  rechazarProducto: (id: Id, comentario: string) =>
    api.put(`/admin/solicitudes-aprobacion/productos/${id}/rechazar`, { comentario }),

  listOfertas: () => api.get('/admin/solicitudes-aprobacion/ofertas'),
  aprobarOferta: (id: Id) => api.put(`/admin/solicitudes-aprobacion/ofertas/${id}/aprobar`),
  rechazarOferta: (id: Id, comentario: string) =>
    api.put(`/admin/solicitudes-aprobacion/ofertas/${id}/rechazar`, { comentario }),
}

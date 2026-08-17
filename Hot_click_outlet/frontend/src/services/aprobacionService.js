import api from './api'

/** Solicitudes de aprobación (empresas, productos, ofertas). */
export const aprobacionService = {
  listEmpresas: () => api.get('/admin/solicitudes-aprobacion'),
  aprobarEmpresa: (id) => api.put(`/admin/solicitudes-aprobacion/${id}/aprobar`),
  rechazarEmpresa: (id) => api.put(`/admin/solicitudes-aprobacion/${id}/rechazar`),

  listProductos: () => api.get('/admin/solicitudes-aprobacion/productos'),
  aprobarProducto: (id) => api.put(`/admin/solicitudes-aprobacion/productos/${id}/aprobar`),
  rechazarProducto: (id, comentario) =>
    api.put(`/admin/solicitudes-aprobacion/productos/${id}/rechazar`, { comentario }),

  listOfertas: () => api.get('/admin/solicitudes-aprobacion/ofertas'),
  aprobarOferta: (id) => api.put(`/admin/solicitudes-aprobacion/ofertas/${id}/aprobar`),
  rechazarOferta: (id, comentario) =>
    api.put(`/admin/solicitudes-aprobacion/ofertas/${id}/rechazar`, { comentario }),
}

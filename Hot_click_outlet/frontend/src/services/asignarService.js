import api from './api'

/** Asignación de compras/productos a clientes (admin). */
export const asignarService = {
  buscarCliente: (q) =>
    api.get('/admin/asignar/buscar-cliente', { params: { q } }),
  crearCliente: (form) => api.post('/admin/asignar/crear-cliente', form),
  asignarCompra: (body) => api.post('/admin/asignar/compra', body),
}

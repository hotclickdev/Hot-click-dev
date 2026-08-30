import api from './api'
import type { JsonBody } from '@/types/api'

/** Asignación de compras/productos a clientes (admin). */
export const asignarService = {
  buscarCliente: (q: string) =>
    api.get('/admin/asignar/buscar-cliente', { params: { q } }),
  crearCliente: (form: JsonBody) => api.post('/admin/asignar/crear-cliente', form),
  asignarCompra: (body: JsonBody) => api.post('/admin/asignar/compra', body),
}

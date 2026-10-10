import api from '@/services/api'

export const consolaService = {
  buscar: (q: string) => api.get('/admin/consola/buscar', { params: { q } }),
  reloj: () => api.get('/admin/consola/reloj'),
  crm: () => api.get('/admin/consola/crm'),
  movimiento: (dias = 30) => api.get('/admin/consola/movimiento', { params: { dias } }),
  quincena: (desde?: string, hasta?: string) => api.get('/admin/consola/quincena', { params: { desde, hasta } }),
  ficha: (id: string) => api.get(`/admin/consola/tiendas/${id}`),
  sancionar: (id: string, nivel: string, motivo: string, politica: string) =>
    api.post(`/admin/consola/tiendas/${id}/sanciones`, { nivel, motivo, politica }),
  pedido: (id: string) => api.get(`/admin/consola/pedidos/${id}`),
  resolucion: (id: string, tipo: string, nota: string) =>
    api.put(`/admin/consola/pedidos/${id}/resolucion`, { tipo, nota }),
  sinInventario: (pedidoId: string, itemId: string) =>
    api.put(`/admin/consola/pedidos/${pedidoId}/items/${itemId}/sin-inventario`),
  comprador: (id: string) => api.get(`/admin/consola/compradores/${id}`),
  nota: (empresaId: string, nota: string, proximaAccion: string, bandeja: string) =>
    api.post('/admin/consola/notas', { empresaId, nota, proximaAccion, bandeja }),
  efectivo: (id: string, monto: number) => api.put(`/admin/consola/recolecciones/${id}/efectivo`, { monto }),
  rapidas: () => api.get('/admin/consola/tiendas-rapidas'),
  crearRapida: (negocio: string, persona: string, telefono: string, dias: number) =>
    api.post('/admin/consola/tiendas-rapidas', { negocio, persona, telefono, dias }),
  verRapida: (token: string) => api.get(`/public/tienda-rapida/${token}`),
  completarRapida: (token: string, datos: {
    persona: string; cedula: string; correo: string; telefono: string; clave: string; acepto: boolean; versionLegal: string
  }) => api.post(`/public/tienda-rapida/${token}`, datos),
  regenerarRapida: (id: string) => api.post(`/admin/consola/tiendas-rapidas/${id}/regenerar`),
  revocarRapida: (id: string) => api.post(`/admin/consola/tiendas-rapidas/${id}/revocar`),
  onboardingRapido: () => api.get('/emprendedor/negocio-rapido/onboarding'),
  marcarPasoRapido: (paso: string, accion: 'HECHO' | 'OMITIR') =>
    api.put(`/emprendedor/negocio-rapido/onboarding/${paso}`, { accion }),
}

export function objetoDe(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {}
}

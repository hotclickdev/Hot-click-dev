import api from './api'
import type { Id } from '@/types/api'

export const securityService = {
  // Dashboard principal
  getDashboard: (period = '24h') =>
    api.get(`/security/dashboard?period=${period}`),

  // Eventos paginados con filtros
  getEvents: ({ page = 0, size = 20, type, severity, period = '7d' }: {
    page?: number
    size?: number
    type?: string
    severity?: string
    period?: string
  } = {}) => {
    const params = new URLSearchParams({ page: String(page), size: String(size), period })
    if (type)     params.set('type', type)
    if (severity) params.set('severity', severity)
    return api.get(`/security/events?${params}`)
  },

  // Alertas
  getAlerts:    (resolved = false) => api.get(`/security/alerts?resolved=${resolved}`),
  resolveAlert: (id: Id)               => api.put(`/security/alerts/${id}/resolve`),

  // Usuarios con perfil de seguridad
  getUsuarios: ({ page = 0, size = 20 }: { page?: number; size?: number } = {}) =>
    api.get(`/security/usuarios/lista?page=${page}&size=${size}`),

  getEventosPorUsuario: (email: string) =>
    api.get(`/security/usuarios/${encodeURIComponent(email)}/eventos`),

  // Sesiones activas
  getSesionesActivas: () => api.get('/security/sesiones-activas'),

  // IPs sospechosas
  getIpsSospechosas: (period = '24h') =>
    api.get(`/security/ips-sospechosas?period=${period}`),

  // IPs bloqueadas
  getIpsBloqueadas: ()              => api.get('/security/ips-bloqueadas'),
  bloquearIp:       (ip: string, motivo: string)    => api.post('/security/ips-bloqueadas', { ip, motivo }),
  desbloquearIp:    (ip: string)            => api.delete(`/security/ips-bloqueadas/${encodeURIComponent(ip)}`),

  // Export CSV — retorna URL directa para descargar
  getExportUrl: (period = '7d') =>
    `${api.defaults.baseURL}/security/eventos/export?period=${period}`,

  getAiDashboard: (anio: number, mes: number) =>
    api.get('/security/ai/dashboard', { params: { anio, mes } }),
}

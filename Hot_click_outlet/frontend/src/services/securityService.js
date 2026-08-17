import api from './api'

export const securityService = {
  // Dashboard principal
  getDashboard: (period = '24h') =>
    api.get(`/security/dashboard?period=${period}`),

  // Eventos paginados con filtros
  getEvents: ({ page = 0, size = 20, type, severity, period = '7d' } = {}) => {
    const params = new URLSearchParams({ page, size, period })
    if (type)     params.set('type', type)
    if (severity) params.set('severity', severity)
    return api.get(`/security/events?${params}`)
  },

  // Alertas
  getAlerts:    (resolved = false) => api.get(`/security/alerts?resolved=${resolved}`),
  resolveAlert: (id)               => api.put(`/security/alerts/${id}/resolve`),

  // Usuarios con perfil de seguridad
  getUsuarios: ({ page = 0, size = 20 } = {}) =>
    api.get(`/security/usuarios/lista?page=${page}&size=${size}`),

  getEventosPorUsuario: (email) =>
    api.get(`/security/usuarios/${encodeURIComponent(email)}/eventos`),

  // Sesiones activas
  getSesionesActivas: () => api.get('/security/sesiones-activas'),

  // IPs sospechosas
  getIpsSospechosas: (period = '24h') =>
    api.get(`/security/ips-sospechosas?period=${period}`),

  // IPs bloqueadas
  getIpsBloqueadas: ()              => api.get('/security/ips-bloqueadas'),
  bloquearIp:       (ip, motivo)    => api.post('/security/ips-bloqueadas', { ip, motivo }),
  desbloquearIp:    (ip)            => api.delete(`/security/ips-bloqueadas/${encodeURIComponent(ip)}`),

  // Export CSV — retorna URL directa para descargar
  getExportUrl: (period = '7d') =>
    `${api.defaults.baseURL}/security/eventos/export?period=${period}`,

  getAiDashboard: (anio, mes) =>
    api.get('/security/ai/dashboard', { params: { anio, mes } }),
}

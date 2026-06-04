import api from './api'

export const securityService = {
  getDashboard: (period = '24h') =>
    api.get(`/security/dashboard?period=${period}`),

  getEvents: ({ page = 0, size = 20, type, severity, period = '7d' } = {}) => {
    const params = new URLSearchParams({ page, size, period })
    if (type)     params.set('type', type)
    if (severity) params.set('severity', severity)
    return api.get(`/security/events?${params}`)
  },

  getAlerts: (resolved = false) =>
    api.get(`/security/alerts?resolved=${resolved}`),

  resolveAlert: (id) =>
    api.put(`/security/alerts/${id}/resolve`),
}

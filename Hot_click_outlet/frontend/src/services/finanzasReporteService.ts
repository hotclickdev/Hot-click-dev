import api from './api'

export const finanzasReporteService = {
  getKpis: (fechaInicio?: string, fechaFin?: string) =>
    api.get('/admin/finanzas/reporte-iva', { params: { fechaInicio, fechaFin } })
      .then(r => r.data?.data ?? r.data ?? {}),

  descargarCsv: async (fechaInicio?: string, fechaFin?: string) => {
    const response = await api.get('/admin/finanzas/reporte-iva', {
      params: { fechaInicio, fechaFin, download: true },
      responseType: 'blob',
    })
    const url  = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `reporte_contador_${fechaInicio || 'inicio'}_a_${fechaFin || 'hoy'}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
}

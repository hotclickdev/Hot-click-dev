import api from './api'

export const importService = {
  extraerDeUrl: (url) =>
    api.post('/admin/importar/url', { url }),

  extraerDePdf: (archivo) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    // Timeout extendido (default global: 15s) — catálogos escaneados sin texto se procesan
    // con visión en varios lotes de páginas, puede tomar más de un minuto.
    return api.post('/admin/importar/pdf', fd, { headers: { 'Content-Type': undefined }, timeout: 240000 })
  },

  extraerDeCsv: (archivo) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return api.post('/admin/importar/csv', fd, { headers: { 'Content-Type': undefined } })
  },

  confirmar: (productos) =>
    api.post('/admin/importar/confirmar', productos),
}

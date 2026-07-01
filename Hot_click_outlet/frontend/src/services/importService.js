import api from './api'

export const importService = {
  extraerDeUrl: (url) =>
    api.post('/admin/importar/url', { url }),

  extraerDePdf: (archivo) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return api.post('/admin/importar/pdf', fd, { headers: { 'Content-Type': undefined } })
  },

  extraerDeCsv: (archivo) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return api.post('/admin/importar/csv', fd, { headers: { 'Content-Type': undefined } })
  },

  confirmar: (productos) =>
    api.post('/admin/importar/confirmar', productos),
}

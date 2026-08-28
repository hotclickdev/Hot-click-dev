import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const importService = {
  extraerDeUrl: (url: string) =>
    api.post('/admin/importar/url', { url }),

  extraerDePdf: (archivo: File) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    // Timeout extendido (default global: 15s) — catálogos escaneados sin texto se procesan
    // con visión en varios lotes de páginas, puede tomar más de un minuto.
    return api.post('/admin/importar/pdf', fd, { headers: { 'Content-Type': undefined }, timeout: 240000 })
  },

  extraerDeCsv: (archivo: File) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return api.post('/admin/importar/csv', fd, { headers: { 'Content-Type': undefined } })
  },

  confirmar: (productos: JsonBody[], empresaId: Id | null) =>
    // Timeout extendido — cada producto puede implicar descargar y resubir su imagen a S3.
    api.post('/admin/importar/confirmar', productos, {
      timeout: 120000,
      params: empresaId ? { empresaId } : undefined,
    }),
}

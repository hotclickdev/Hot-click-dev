import api from './api'

export type CompraD105 = {
  id: number
  claveNumerica: string
  tipoDocumento: string
  fechaEmision: string
  anio: number
  trimestre: string
  emisorCedula: string
  emisorNombre: string
  subtotalNeto: number
  totalImpuesto: number
  totalComprobante: number
  tieneFoto: boolean
}

export type PaginaCompras = {
  content?: CompraD105[]
  totalElements?: number
}

const d105Service = {
  listar: (page = 0, size = 20) =>
    api.get<PaginaCompras>('/admin/d105/compras', { params: { page, size } }),
  cargar: (archivo: File, foto: File | null) => {
    const form = new FormData()
    form.append('archivo', archivo)
    if (foto) form.append('foto', foto)
    return api.post('/admin/d105/compras', form)
  },
  foto: (id: number) =>
    api.get<Blob>(`/admin/d105/compras/${id}/foto`, { responseType: 'blob' }),
}

export default d105Service

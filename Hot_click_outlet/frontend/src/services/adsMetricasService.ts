import api from './api'

export type AdsMetricasResumen = {
  desde?: string
  hasta?: string
  ventanaDias?: number
  ingresosAtribuidos?: number
  utilidadAtribuida?: number
  pedidosAtribuidos?: number
  gastoTotal?: number | null
  roasIngresos?: number | null
  roasUtilidad?: number | null
  roasBlended?: number | null
  ingresosTotalesPeriodo?: number
  cac?: number | null
  nuevosClientes?: number
  ltv90?: number
  campanas?: AdsCampanaRow[]
  cpmCpc?: {
    impresiones?: number
    clics?: number
    gasto?: number
    cpm?: number | null
    cpc?: number | null
    cpr?: number | null
  }
  alertas?: AdsAlerta[]
}

export type AdsCampanaRow = {
  campana: string
  pedidos: number
  ingresos: number
  utilidad: number
  nuevosClientes: number
  gasto: number | null
  roasIngresos: number | null
  roasUtilidad: number | null
}

export type AdsAlerta = {
  tipo: string
  campana?: string
  anuncio?: string
  mensaje: string
  frecuencia?: number
  ctr?: number
  shareGasto?: number
  anunciosActivos?: number
}

export type AdsGastoRow = {
  id: number
  fecha: string
  canal: string
  campana: string
  montoCrc: number
  notas?: string | null
  fuente?: string
}

function dataOf<T>(res: { data?: { data?: T } | T }): T {
  const body = res.data
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

export const adsMetricasService = {
  metricas(params: { desde: string; hasta: string; ventanaDias?: number }) {
    return api.get('/admin/ads/metricas', { params }).then((r) => dataOf<AdsMetricasResumen>(r))
  },
  listarGastos(params: { desde: string; hasta: string }) {
    return api.get('/admin/ads/gastos', { params }).then((r) => dataOf<AdsGastoRow[]>(r) ?? [])
  },
  crearGasto(body: {
    fecha: string
    campana: string
    montoCrc: number
    canal?: string
    notas?: string
  }) {
    return api.post('/admin/ads/gastos', body).then((r) => dataOf<AdsGastoRow>(r))
  },
  eliminarGasto(id: number) {
    return api.delete(`/admin/ads/gastos/${id}`)
  },
}

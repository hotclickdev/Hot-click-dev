// Campañas a clientes con consentimiento (AG-36) y catálogo de Meta (AG-37).

export type SegmentoTipo = 'TODOS' | 'COMPRADORES_RECIENTES' | 'INTERES_CATEGORIA' | 'LEADS'

export type SegmentoCampana = { tipo: SegmentoTipo; dias: number | null; categoriaId: number | null }

export type EstadoPlantilla = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'

export type PlantillaMarketing = {
  id: number
  nombre: string
  idioma: string
  cuerpo: string
  estado: EstadoPlantilla
  motivoRechazo: string | null
  creadoEn: string
}

export type PedidoPlantilla = { nombre: string; cuerpo: string; ejemplos: string[] }

export type EstadoCampana = 'BORRADOR' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'

export type Campana = {
  id: number
  nombre: string
  plantillaId: number
  segmento: SegmentoCampana
  parametros: string[]
  estado: EstadoCampana
  programadaPara: string | null
  destinatarios: number
  costoEstimadoUsd: number
  lanzadaEn: string | null
  finalizadaEn: string | null
  creadoEn: string
}

export type PedidoCampana = {
  nombre: string
  plantillaId: number
  segmento: SegmentoCampana
  parametros: string[]
  programadaPara: string | null
}

export type EstimacionCampana = {
  conConsentimiento: number
  excluidosPorBaja: number
  excluidosPorTopeContacto: number
  permitidos: number
  costoEstimadoUsd: number
  topeMensual: number
  restanteMes: number
}

export type MetricasCampana = {
  total: number
  pendientes: number
  enviados: number
  entregados: number
  leidos: number
  respondidos: number
  fallidos: number
  omitidos: number
}

export type DetalleCampana = { campana: Campana; metricas: MetricasCampana }

export type ResumenConsentimientos = { activos: number; revocados: number }

export type EstadoCatalogo = {
  conectado: boolean
  catalogoId: string | null
  ultimaSync: string | null
  ultimoError: string | null
  sincronizados: number
}

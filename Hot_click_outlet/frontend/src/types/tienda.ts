export type EmpresaTiendaPublica = {
  slug?: string
  nombreComercial?: string
  logoUrl?: string | null
  colorPrimario?: string
  colorSecundario?: string
  colorAcento?: string
  tagline?: string | null
  whatsapp?: string | null
  moneda?: string
}

export type TenantFeatures = {
  pos?: boolean
  crm?: boolean
  compras?: boolean
  reportes?: boolean
  ai?: boolean
  api?: boolean
  [key: string]: boolean | undefined
}

export type TenantInfo = {
  planNombre?: string
  planId?: number | null
  estadoPlan?: string
  trialDias?: number
  fechaVenc?: string | null
  timezone?: string
  maxUsuarios?: number
  maxProductos?: number
  maxBodegas?: number
  maxCajas?: number
  comisionPorcentaje?: number
  comisionMinimaCrc?: number
  features?: TenantFeatures
}

export type TenantUso = {
  productos?: number
  usuarios?: number
}

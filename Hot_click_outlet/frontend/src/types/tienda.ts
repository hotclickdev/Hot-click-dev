export type RetiroTienda = {
  nombre?: string
  provincia?: string
  canton?: string
  direccion?: string
  horarioApertura?: string
  horarioCierre?: string
}

export type EmpresaTiendaPublica = {
  slug?: string
  nombreComercial?: string
  logoUrl?: string | null
  colorPrimario?: string
  colorSecundario?: string
  colorAcento?: string
  tagline?: string | null
  footerTexto?: string | null
  whatsapp?: string | null
  moneda?: string
  descripcion?: string | null
  categoriaNegocio?: string | null
  instagram?: string | null
  zonaEnvio?: string | null
  ogImagenUrl?: string | null
  enHotclickDesde?: string | null
  facturaElectronica?: boolean
  /**
   * Lo decide el backend según el plan: true solo en PYME o NEGOCIO_PLUS. En EMPRENDEDOR la API manda
   * whatsapp e instagram vacíos y esto en false; el visitante no ve contacto directo del vendedor.
   */
  contactoDirecto?: boolean
  retiro?: RetiroTienda | null
}

export type TenantFeatures = {
  pos?: boolean
  crm?: boolean
  compras?: boolean
  reportes?: boolean
  ai?: boolean
  api?: boolean
  giftCards?: boolean
  [key: string]: boolean | undefined
}

export type TenantInfo = {
  planNombre?: string
  planId?: number | null
  estadoPlan?: string
  estadoEmpresa?: string
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
  bodegas?: number
  cajas?: number
}

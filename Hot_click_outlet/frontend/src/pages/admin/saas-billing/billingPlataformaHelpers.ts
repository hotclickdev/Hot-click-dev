export type BillingFila = {
  empresaId: number
  nombre: string
  slug?: string
  estadoEmpresa?: string
  plan: string
  comisionPorcentaje: number
  precioMensual: number
  estadoSuscripcion: string
  estadoPlan?: string
  proveedor: string
  fechaVencPlan?: string | null
  fallosCobro: number
  alertaCobro: boolean
}

export type BillingKpis = {
  total: number
  pastDue: number
  conAlertaCobro: number
  conOnvo: number
  conStripe: number
}

export type BillingSuscripcion = {
  estado: string
  proveedor: string
  fechaInicio?: string | null
  fechaFin?: string | null
  trialEnd?: string | null
  onvoCustomerId?: string | null
  onvoSubscriptionId?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  planNombre?: string
}

export type BillingFactura = {
  id: number
  stripeInvoiceId?: string | null
  montoCentavos?: number | null
  moneda?: string
  estado?: string
  periodoInicio?: string | null
  periodoFin?: string | null
  fechaCreacion?: string | null
}

export type BillingLedgerEvento = {
  id: number
  tipo: string
  proveedor?: string | null
  referenciaExterna?: string | null
  montoCentavos?: number | null
  moneda?: string
  detalle?: string | null
  fechaEvento?: string | null
}

export type FiltroBilling = 'TODAS' | 'ALERTA' | 'PAST_DUE' | 'ONVO'

function esRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function numero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function opcional(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export function parsearFila(raw: unknown): BillingFila | null {
  if (!esRecord(raw)) return null
  const id = numero(raw.empresaId)
  if (!id) return null
  return {
    empresaId: id,
    nombre: texto(raw.nombre) || 'Sin nombre',
    slug: opcional(raw.slug) ?? undefined,
    estadoEmpresa: opcional(raw.estadoEmpresa) ?? undefined,
    plan: texto(raw.plan) || 'EMPRENDEDOR',
    comisionPorcentaje: numero(raw.comisionPorcentaje),
    precioMensual: numero(raw.precioMensual),
    estadoSuscripcion: texto(raw.estadoSuscripcion) || 'SIN_SUSCRIPCION',
    estadoPlan: opcional(raw.estadoPlan) ?? undefined,
    proveedor: texto(raw.proveedor) || 'NINGUNO',
    fechaVencPlan: opcional(raw.fechaVencPlan),
    fallosCobro: numero(raw.fallosCobro),
    alertaCobro: raw.alertaCobro === true,
  }
}

export function parsearConsola(raw: unknown): { empresas: BillingFila[]; kpis: BillingKpis } {
  const body = esRecord(raw) ? raw : {}
  const lista = Array.isArray(body.empresas) ? body.empresas : []
  const k = esRecord(body.kpis) ? body.kpis : {}
  return {
    empresas: lista.map(parsearFila).filter((f): f is BillingFila => f != null),
    kpis: {
      total: numero(k.total),
      pastDue: numero(k.pastDue),
      conAlertaCobro: numero(k.conAlertaCobro),
      conOnvo: numero(k.conOnvo),
      conStripe: numero(k.conStripe),
    },
  }
}

export function parsearDetalle(raw: unknown): {
  empresa: BillingFila | null
  suscripcion: BillingSuscripcion
  facturas: BillingFactura[]
  ledger: BillingLedgerEvento[]
} {
  const body = esRecord(raw) ? raw : {}
  const sub = esRecord(body.suscripcion) ? body.suscripcion : {}
  const facturas = Array.isArray(body.facturas) ? body.facturas : []
  const ledger = Array.isArray(body.ledger) ? body.ledger : []
  return {
    empresa: parsearFila(body.empresa),
    suscripcion: {
      estado: texto(sub.estado) || 'SIN_SUSCRIPCION',
      proveedor: texto(sub.proveedor) || 'NINGUNO',
      fechaInicio: opcional(sub.fechaInicio),
      fechaFin: opcional(sub.fechaFin),
      trialEnd: opcional(sub.trialEnd),
      onvoCustomerId: opcional(sub.onvoCustomerId),
      onvoSubscriptionId: opcional(sub.onvoSubscriptionId),
      stripeCustomerId: opcional(sub.stripeCustomerId),
      stripeSubscriptionId: opcional(sub.stripeSubscriptionId),
      planNombre: texto(sub.planNombre) || undefined,
    },
    facturas: facturas.map(parsearFactura).filter((f): f is BillingFactura => f != null),
    ledger: ledger.map(parsearLedger).filter((e): e is BillingLedgerEvento => e != null),
  }
}

function parsearFactura(raw: unknown): BillingFactura | null {
  if (!esRecord(raw)) return null
  const id = numero(raw.id)
  if (!id) return null
  return {
    id,
    stripeInvoiceId: opcional(raw.stripeInvoiceId),
    montoCentavos: typeof raw.montoCentavos === 'number' ? raw.montoCentavos : null,
    moneda: texto(raw.moneda) || undefined,
    estado: texto(raw.estado) || undefined,
    periodoInicio: opcional(raw.periodoInicio),
    periodoFin: opcional(raw.periodoFin),
    fechaCreacion: opcional(raw.fechaCreacion),
  }
}

function parsearLedger(raw: unknown): BillingLedgerEvento | null {
  if (!esRecord(raw)) return null
  const id = numero(raw.id)
  if (!id) return null
  return {
    id,
    tipo: texto(raw.tipo) || 'EVENTO',
    proveedor: opcional(raw.proveedor),
    referenciaExterna: opcional(raw.referenciaExterna),
    montoCentavos: typeof raw.montoCentavos === 'number' ? raw.montoCentavos : null,
    moneda: texto(raw.moneda) || undefined,
    detalle: opcional(raw.detalle),
    fechaEvento: opcional(raw.fechaEvento),
  }
}

export function filtrarFilas(filas: BillingFila[], filtro: FiltroBilling): BillingFila[] {
  if (filtro === 'ALERTA') return filas.filter((f) => f.alertaCobro)
  if (filtro === 'PAST_DUE') {
    return filas.filter((f) => f.estadoSuscripcion === 'PAST_DUE' || f.estadoPlan === 'PAST_DUE')
  }
  if (filtro === 'ONVO') {
    return filas.filter((f) => f.proveedor === 'ONVO' || f.proveedor === 'AMBOS')
  }
  return filas
}

export function etiquetaProveedor(proveedor: string): string {
  if (proveedor === 'ONVO') return 'Onvo'
  if (proveedor === 'STRIPE') return 'Stripe'
  if (proveedor === 'AMBOS') return 'Onvo + Stripe'
  return 'Sin pasarela'
}

export function etiquetaComision(pct: number): string {
  return `${pct.toLocaleString('es-CR', { maximumFractionDigits: 2 })}%`
}

import api from '@/services/api'

/**
 * S6-18: tablero de comisión cobrada por semana y por plan.
 * Contrato: `docs/contratos/S6-18-comision-por-plan.md` (PR #193), `GET /api/admin/finanzas/comision-por-plan`.
 * Los montos salen tal cual del ledger del backend (colones enteros); el front solo suma lo que llega.
 */
export const RUTA_COMISION_POR_PLAN = '/admin/finanzas/comision-por-plan'
/** Igual que `ComisionPorPlanService.MAX_DIAS` del backend. */
export const MAX_DIAS_RANGO = 366

export type FilaComisionPlan = {
  /** Lunes de la semana, `YYYY-MM-DD`. */
  semana: string
  plan: string
  ventas: number
  totalBruto: number
  comisionSaas: number
  comisionPasarela: number
}

export type ComisionPorPlan = {
  desde: string
  hasta: string
  moneda: string
  filas: FilaComisionPlan[]
}

export type RangoComision = { desde?: string; hasta?: string }

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

function fechaValida(valor: string): boolean {
  if (!FECHA_ISO.test(valor)) return false
  const d = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor
}

function dias(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000)
}

/** Mismas reglas que el 400 del backend; devuelve el motivo o null si el rango sirve. Vacío = valor por defecto del backend. */
export function errorRango({ desde, hasta }: RangoComision): string | null {
  if (desde && !fechaValida(desde)) return 'La fecha «desde» no es válida.'
  if (hasta && !fechaValida(hasta)) return 'La fecha «hasta» no es válida.'
  if (desde && hasta) {
    if (hasta < desde) return '«Hasta» no puede ser anterior a «desde».'
    if (dias(desde, hasta) > MAX_DIAS_RANGO) return `El rango máximo es de ${MAX_DIAS_RANGO} días.`
  }
  return null
}

function entero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

function cadena(valor: unknown, defecto = ''): string {
  return typeof valor === 'string' ? valor : defecto
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : null
}

/**
 * Lee el `data` del contrato. El interceptor de `api` ya desenvuelve el `ResponseDTO`, así que llega
 * `{ desde, hasta, moneda, filas }`; también acepta el sobre completo. Campos ausentes = 0, nunca estimados.
 */
export function leerComisionPorPlan(respuesta: unknown): ComisionPorPlan {
  const raiz = objeto(respuesta) ?? {}
  const data = 'filas' in raiz ? raiz : objeto(raiz.data) ?? {}
  const filas = Array.isArray(data.filas) ? data.filas : []
  return {
    desde: cadena(data.desde),
    hasta: cadena(data.hasta),
    moneda: cadena(data.moneda, 'CRC'),
    filas: filas
      .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === 'object')
      .map((f) => ({
        semana: cadena(f.semana),
        plan: cadena(f.plan, 'SIN_PLAN'),
        ventas: entero(f.ventas),
        totalBruto: entero(f.totalBruto),
        comisionSaas: entero(f.comisionSaas),
        comisionPasarela: entero(f.comisionPasarela),
      })),
  }
}

export async function cargarComisionPorPlan(rango: RangoComision = {}): Promise<ComisionPorPlan> {
  const params: Record<string, string> = {}
  if (rango.desde) params.desde = rango.desde
  if (rango.hasta) params.hasta = rango.hasta
  const { data } = await api.get(RUTA_COMISION_POR_PLAN, { params })
  return leerComisionPorPlan(data)
}

/** Mensaje para el operador según el código del contrato. */
export function mensajeErrorComision(err: unknown): string {
  const r = err && typeof err === 'object' ? (err as { response?: { status?: number; data?: { message?: unknown } } }).response : undefined
  const status = r?.status
  if (status === 400) {
    const m = r?.data?.message
    return typeof m === 'string' && m ? m : 'El rango de fechas no es válido.'
  }
  if (status === 401) return 'Tu sesión venció. Volvé a entrar.'
  if (status === 403) return 'Este tablero es solo para administradores de HotClick.'
  return 'No se pudo cargar la comisión por plan.'
}

export type TotalPlan = {
  plan: string
  ventas: number
  totalBruto: number
  comisionSaas: number
  comisionPasarela: number
}

/** Suma por plan lo que mandó el backend, ordenado por comisión SaaS (mayor primero). */
export function totalesPorPlan(filas: FilaComisionPlan[]): TotalPlan[] {
  const acc = new Map<string, TotalPlan>()
  for (const f of filas) {
    const t = acc.get(f.plan) ?? { plan: f.plan, ventas: 0, totalBruto: 0, comisionSaas: 0, comisionPasarela: 0 }
    t.ventas += f.ventas
    t.totalBruto += f.totalBruto
    t.comisionSaas += f.comisionSaas
    t.comisionPasarela += f.comisionPasarela
    acc.set(f.plan, t)
  }
  return [...acc.values()].sort((a, b) => b.comisionSaas - a.comisionSaas || a.plan.localeCompare(b.plan))
}

export function totalGeneral(filas: FilaComisionPlan[]): Omit<TotalPlan, 'plan'> {
  return filas.reduce(
    (t, f) => ({
      ventas: t.ventas + f.ventas,
      totalBruto: t.totalBruto + f.totalBruto,
      comisionSaas: t.comisionSaas + f.comisionSaas,
      comisionPasarela: t.comisionPasarela + f.comisionPasarela,
    }),
    { ventas: 0, totalBruto: 0, comisionSaas: 0, comisionPasarela: 0 },
  )
}

/** Filas agrupadas por semana, en el orden del backend (semana y luego plan). */
export function filasPorSemana(filas: FilaComisionPlan[]): Array<{ semana: string; filas: FilaComisionPlan[] }> {
  const grupos: Array<{ semana: string; filas: FilaComisionPlan[] }> = []
  for (const f of filas) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.semana === f.semana) ultimo.filas.push(f)
    else grupos.push({ semana: f.semana, filas: [f] })
  }
  return grupos
}

const NOMBRES_PLAN: Record<string, string> = {
  EMPRENDEDOR: 'Emprendedor',
  PYME: 'Pyme',
  NEGOCIO_PLUS: 'Negocio Plus',
  SIN_PLAN: 'Sin plan',
}

export function nombrePlanComision(plan: string): string {
  return NOMBRES_PLAN[plan.toUpperCase()] ?? plan
}

/** «5 oct 2026» a partir de `YYYY-MM-DD`, sin desfase de zona. */
export function fechaLegible(iso: string): string {
  if (!fechaValida(iso)) return iso
  const d = new Date(`${iso}T12:00:00Z`)
  return new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d).replace(/\./g, '')
}

/** «Semana del 5 oct 2026» a partir del lunes ISO. */
export function etiquetaSemana(lunes: string): string {
  return fechaValida(lunes) ? `Semana del ${fechaLegible(lunes)}` : lunes
}

export function colonesComision(monto: number, moneda = 'CRC'): string {
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: moneda || 'CRC', maximumFractionDigits: 0 }).format(monto)
}

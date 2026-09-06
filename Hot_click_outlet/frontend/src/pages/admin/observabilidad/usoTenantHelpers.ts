/** Tipos y helpers de agregación para uso por tenant (admin). */

export type UsoTenantFila = {
  empresaId: number
  nombre?: string
  slug?: string
  estadoEmpresa?: string
  plan?: string
  gmv: number
  pedidos: number
  gmvMes: number
  pedidosMes: number
  llamadasAi: number
  tokensEntrada: number
  tokensSalida: number
  tokensMes: number
  limiteAi: number
  pctCuotaAi: number
  costoAiUsd: number
  productos: number
  imagenes: number
  creditosRestantes?: number
  anio?: number
  mes?: number
  notaAlmacenamiento?: string
}

export type UsoTenantsRanking = {
  anio: number
  mes: number
  tenants: UsoTenantFila[]
  resumen?: {
    tenants: number
    gmvTotal: number
    pedidosTotal: number
    tokensMesTotal: number
  }
}

export type OrdenUsoTenant = 'gmv' | 'pedidos' | 'tokensMes' | 'llamadasAi' | 'imagenes'

export const MESES_USO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

export function rankingDesdeRespuesta(data: unknown): UsoTenantsRanking {
  if (!data || typeof data !== 'object') {
    return { anio: 0, mes: 0, tenants: [] }
  }
  const d = data as UsoTenantsRanking
  return {
    anio: d.anio ?? 0,
    mes: d.mes ?? 0,
    tenants: Array.isArray(d.tenants) ? d.tenants : [],
    resumen: d.resumen,
  }
}

export function detalleUsoDesdeRespuesta(data: unknown): UsoTenantFila | null {
  if (!data || typeof data !== 'object') return null
  const d = data as UsoTenantFila
  if (d.empresaId == null) return null
  return d
}

export function ordenarTenants(
  tenants: UsoTenantFila[],
  orden: OrdenUsoTenant,
  desc = true,
): UsoTenantFila[] {
  const copia = [...tenants]
  copia.sort((a, b) => {
    const va = Number(a[orden] ?? 0)
    const vb = Number(b[orden] ?? 0)
    return desc ? vb - va : va - vb
  })
  return copia
}

export function etiquetaLimiteAi(limite: number): string {
  if (limite < 0) return 'Ilimitado'
  if (limite === 0) return 'Sin IA'
  return new Intl.NumberFormat('es-CR').format(limite)
}

export function formatoTokens(n?: number | null): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return new Intl.NumberFormat('es-CR').format(n)
}

export function tonoCuotaAi(pct: number): 'ok' | 'warn' | 'danger' | 'muted' {
  if (pct >= 100) return 'danger'
  if (pct >= 80) return 'warn'
  if (pct <= 0) return 'muted'
  return 'ok'
}

export function claseCuotaAi(pct: number): string {
  switch (tonoCuotaAi(pct)) {
    case 'danger': return 'text-red-500'
    case 'warn': return 'text-amber-500'
    case 'ok': return 'text-green-600'
    default: return 'text-gray-400'
  }
}

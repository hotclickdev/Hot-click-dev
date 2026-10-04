/**
 * Bajar de plan con más uso del permitido (decisión del 3-oct-2026, 13:55 CR): no se borra nada; el cambio queda
 * bloqueado con un aviso por recurso hasta que el uso entre en los límites del plan nuevo.
 */
export type RecursoPlan = 'productos' | 'bodegas' | 'cajas' | 'usuarios'

/** Orden en el que se muestran los recursos en el aviso. */
export const RECURSOS_PLAN: readonly RecursoPlan[] = ['productos', 'bodegas', 'cajas', 'usuarios']

export type LimitesPlan = {
  maxProductos?: number | null
  maxBodegas?: number | null
  maxCajas?: number | null
  maxUsuarios?: number | null
}

export type UsoTenant = Record<RecursoPlan, number>

export type ExcesoPlan = { recurso: RecursoPlan; uso: number; limite: number; exceso: number }

const CLAVE_LIMITE: Record<RecursoPlan, keyof LimitesPlan> = {
  productos: 'maxProductos',
  bodegas: 'maxBodegas',
  cajas: 'maxCajas',
  usuarios: 'maxUsuarios',
}

/** `-1`, `null` o ausente = sin límite. */
function exceso(recurso: RecursoPlan, uso: number, limite: number | null | undefined): ExcesoPlan | null {
  if (limite == null || limite < 0) return null
  if (uso <= limite) return null
  return { recurso, uso, limite, exceso: uso - limite }
}

export function excesosAlBajar(destino: LimitesPlan, uso: UsoTenant): ExcesoPlan[] {
  return RECURSOS_PLAN
    .map((recurso) => exceso(recurso, uso[recurso], destino[CLAVE_LIMITE[recurso]]))
    .filter((e): e is ExcesoPlan => e !== null)
}

/** Recursos que ya entran en el plan destino (los ilimitados también entran). */
export function recursosQueEntran(excesos: ExcesoPlan[]): RecursoPlan[] {
  const sobrepasados = new Set(excesos.map((e) => e.recurso))
  return RECURSOS_PLAN.filter((recurso) => !sobrepasados.has(recurso))
}

const NOMBRE_RECURSO: Record<RecursoPlan, { singular: string; plural: string }> = {
  productos: { singular: 'producto', plural: 'productos' },
  bodegas: { singular: 'bodega', plural: 'bodegas' },
  cajas: { singular: 'caja', plural: 'cajas' },
  usuarios: { singular: 'usuario', plural: 'usuarios' },
}

export function nombreRecurso(recurso: RecursoPlan, cantidad: number): string {
  const nombre = NOMBRE_RECURSO[recurso]
  return cantidad === 1 ? nombre.singular : nombre.plural
}

/** «13 productos», «13 productos y 2 bodegas», «13 productos, 2 bodegas y 1 usuario». */
export function textoFaltante(excesos: ExcesoPlan[]): string {
  const partes = excesos.map((e) => `${e.exceso} ${nombreRecurso(e.recurso, e.exceso)}`)
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

/** «Bodegas», «Bodegas y usuarios», «Productos, bodegas y usuarios» (para decir qué recursos ya entran). */
export function nombresRecursos(recursos: RecursoPlan[]): string {
  const nombres = recursos.map((recurso) => NOMBRE_RECURSO[recurso].plural)
  const texto = nombres.length <= 1
    ? nombres.join('')
    : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Lee el detalle de excesos que devuelve el backend al rechazar una bajada (HTTP 409). */
export function excesosDeRespuesta(data: unknown): ExcesoPlan[] {
  if (typeof data !== 'object' || data === null || !('excesos' in data)) return []
  const lista = (data as { excesos: unknown }).excesos
  if (!Array.isArray(lista)) return []
  return lista.filter(esExcesoValido)
}

function esExcesoValido(valor: unknown): valor is ExcesoPlan {
  if (typeof valor !== 'object' || valor === null) return false
  const candidato = valor as Record<string, unknown>
  return RECURSOS_PLAN.includes(candidato.recurso as RecursoPlan)
    && typeof candidato.uso === 'number'
    && typeof candidato.limite === 'number'
    && typeof candidato.exceso === 'number'
}

const ORDEN_PLAN: Record<string, number> = { EMPRENDEDOR: 0, FREE: 0, PYME: 1, PRO: 1, NEGOCIO_PLUS: 2, ENTERPRISE: 2 }

/** `true` si pasar de `actual` a `destino` es bajar de plan. Nombres desconocidos no cuentan como bajada. */
export function esBajada(actual: string | null | undefined, destino: string): boolean {
  const a = ORDEN_PLAN[(actual ?? '').toUpperCase()]
  const d = ORDEN_PLAN[destino.toUpperCase()]
  return a != null && d != null && d < a
}

/** Ruta del panel para ajustar cada recurso. */
export const RUTA_AJUSTE: Record<RecursoPlan, string> = {
  productos: '/admin/productos',
  bodegas: '/admin/bodegas',
  cajas: '/admin/pos',
  usuarios: '/admin/equipo',
}

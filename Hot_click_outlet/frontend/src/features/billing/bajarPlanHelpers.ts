/**
 * Bajar de plan con más uso del permitido (decisión del 3-oct-2026, 13:55 CR): no se borra nada; el cambio queda
 * bloqueado con un aviso por recurso hasta que el uso entre en los límites del plan nuevo.
 */
export type RecursoPlan = 'productos' | 'usuarios'

export type LimitesPlan = { maxProductos?: number | null; maxUsuarios?: number | null }

export type UsoTenant = { productos: number; usuarios: number }

export type ExcesoPlan = { recurso: RecursoPlan; uso: number; limite: number; exceso: number }

/** `-1`, `null` o ausente = sin límite. */
function exceso(recurso: RecursoPlan, uso: number, limite: number | null | undefined): ExcesoPlan | null {
  if (limite == null || limite < 0) return null
  if (uso <= limite) return null
  return { recurso, uso, limite, exceso: uso - limite }
}

export function excesosAlBajar(destino: LimitesPlan, uso: UsoTenant): ExcesoPlan[] {
  return [
    exceso('productos', uso.productos, destino.maxProductos),
    exceso('usuarios', uso.usuarios, destino.maxUsuarios),
  ].filter((e): e is ExcesoPlan => e !== null)
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
  usuarios: '/admin/equipo',
}

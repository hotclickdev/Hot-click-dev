import type { AliasPlan } from '@/components/comprador/negocios/negociosPublicos'

/** Clave i18n de `emprende.plan*` para cada alias del directorio. */
export const CLAVE_PLAN: Record<AliasPlan, 'planEmprendedor' | 'planPyme' | 'planPlus'> = {
  emprendimientos: 'planEmprendedor',
  pymes: 'planPyme',
  'negocio-plus': 'planPlus',
}

export function textosPlan(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return valor.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

/** El último punto del copy es el precio; el resto es lo incluido. */
export function detallePlan(puntos: readonly string[]): { precio: string; incluye: string[] } {
  if (puntos.length === 0) return { precio: '', incluye: [] }
  return { precio: puntos[puntos.length - 1], incluye: puntos.slice(0, -1) }
}

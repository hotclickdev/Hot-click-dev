const miles = new Intl.NumberFormat('es-CR')

/** Formatea un entero con miles es-CR (KPIs, no montos). */
export function formatoEntero(n: number): string {
  return miles.format(Math.round(n))
}

export type TonoBadge = 'ok' | 'warn' | 'danger' | 'muted' | 'rol'

/** Reglas de moderación de plataforma (Super Admin — política). */
export const REGLAS_MODERACION = [
  { id: 'foto', texto: 'Requiere foto real del producto (no stock photos)', activa: true },
  { id: 'precio', texto: 'Precio mínimo ₡1.000 por publicación', activa: true },
  { id: 'ofensas', texto: 'Revisión automática de descripciones ofensivas', activa: true },
  { id: 'tech', texto: 'Aprobación manual para categoría Tecnología', activa: false },
] as const

export function letraDe(nombre: string): string {
  return (nombre.trim()[0] ?? '?').toUpperCase()
}

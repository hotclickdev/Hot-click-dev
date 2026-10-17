import type { Conciliacion, EstadoOnvo } from './adminOnvoApi'

export const ESTADOS_ONVO: { valor: EstadoOnvo; etiqueta: string; clase: string }[] = [
  { valor: 'SIN_CUENTA', etiqueta: 'Sin cuenta', clase: 'bg-[var(--hc-n-100)] text-hc-n-900' },
  { valor: 'ONBOARDING_PENDIENTE', etiqueta: 'Onboarding pendiente', clase: 'bg-hc-warning-bg text-hc-warning' },
  { valor: 'EN_REVISION', etiqueta: 'En revisión', clase: 'bg-hc-blue-50 text-hc-blue-600' },
  { valor: 'ACTIVA', etiqueta: 'Activa', clase: 'bg-hc-success-bg text-hc-success-text' },
  { valor: 'PAUSADA', etiqueta: 'Pausada', clase: 'bg-[var(--hc-n-100)] text-hc-n-900' },
  { valor: 'SUSPENDIDA', etiqueta: 'Suspendida', clase: 'bg-hc-danger-bg text-hc-danger' },
]

export const CONCILIACION: Record<Conciliacion, { etiqueta: string; clase: string }> = {
  CUADRA: { etiqueta: 'Cuadra', clase: 'bg-hc-success-bg text-hc-success-text' },
  DIFERENCIA: { etiqueta: 'Diferencia', clase: 'bg-hc-danger-bg text-hc-danger' },
  SIN_DATOS: { etiqueta: 'Sin datos', clase: 'bg-[var(--hc-n-100)] text-hc-n-900' },
}

export const FILTRO_CON_DIFERENCIA = 'CON_DIFERENCIA'

export function vistaEstado(e: EstadoOnvo) {
  return ESTADOS_ONVO.find((x) => x.valor === e) ?? ESTADOS_ONVO[0]
}

/** «El % no coincide con el plan»: solo si los dos números llegaron del backend y difieren. */
export function porcentajeNoCoincide(porcentajeOnvo: number | null, porcentajePlan: number | null): boolean {
  return porcentajeOnvo != null && porcentajePlan != null && porcentajeOnvo !== porcentajePlan
}

export function validarPorcentaje(texto: string): { valor: number | null; error: string | null } {
  const limpio = texto.replace(',', '.').trim()
  if (!limpio) return { valor: null, error: 'Escribí el porcentaje.' }
  const n = Number(limpio)
  if (!Number.isFinite(n) || n < 0 || n > 100) return { valor: null, error: 'Tiene que ser un número entre 0 y 100.' }
  return { valor: n, error: null }
}

/** Igual que el 400 de `PUT /api/admin/empresas/{id}/cobros-pausados` (#197): motivo de 3 a 300 caracteres. */
export const MOTIVO_MAX = 300

export function validarMotivo(motivo: string): string | null {
  const largo = motivo.trim().length
  if (largo < 3) return 'El motivo necesita al menos 3 caracteres.'
  return largo > MOTIVO_MAX ? `El motivo puede tener hasta ${MOTIVO_MAX} caracteres.` : null
}

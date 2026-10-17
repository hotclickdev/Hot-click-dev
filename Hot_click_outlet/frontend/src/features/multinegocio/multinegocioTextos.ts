import { esSinAccesoNegocio } from '@/utils/erroresContrato'

/** Copy aprobado de S2 · Multinegocio (/workspace/contenido/sprint2/S2-multinegocio.md). */
export const TEXTOS_MULTINEGOCIO = {
  elegirTitulo: 'Elegí tu negocio',
  elegirSubtitulo: '¿Con cuál querés trabajar ahora?',
  entrar: 'Entrar',
  plan: (plan: string) => `Plan ${plan}`,
  entraste: (negocio: string) => `Entraste a ${negocio}.`,
  sinAccesoTitulo: 'No tenés acceso a este negocio',
  sinAccesoCuerpo: 'Ese emprendimiento no está en tu cuenta o no podés verlo.',
  sinAccesoCta: 'Ir a mis negocios',
} as const

const NOMBRES_PLAN: Record<string, string> = { EMPRENDEDOR: 'Emprendedor', PYME: 'Pyme', NEGOCIO_PLUS: 'Negocio Plus' }

/** Nombre visible del plan; null si el backend no lo manda (no se inventa). */
export function nombrePlan(plan: string | null | undefined): string | null {
  if (!plan) return null
  return NOMBRES_PLAN[plan.toUpperCase()] ?? null
}

/**
 * Contrato real de #201: `POST /api/auth/seleccionar-empresa` responde 403 `SIN_ACCESO_NEGOCIO` si la persona no es
 * miembro activo de ese negocio. Devuelve el texto del estado 403 o `null` si es otro error.
 */
export function mensajeSinAcceso(err: unknown): string | null {
  return esSinAccesoNegocio(err) ? `${TEXTOS_MULTINEGOCIO.sinAccesoTitulo}. ${TEXTOS_MULTINEGOCIO.sinAccesoCuerpo}` : null
}

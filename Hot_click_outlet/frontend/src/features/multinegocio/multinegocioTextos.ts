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

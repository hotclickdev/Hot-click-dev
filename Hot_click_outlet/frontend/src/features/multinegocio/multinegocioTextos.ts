import { codigoError, esSinAccesoNegocio } from '@/utils/erroresContrato'

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

export const TEXTO_NOMBRE_EN_USO = 'Ese nombre de negocio ya está en uso. Probá con otro.'
export const TEXTO_CUPO_NEGOCIOS = 'Llegaste al máximo de negocios para tu cuenta.'

/**
 * Contrato de #176 (`POST /api/auth/nuevo-negocio`): 409 `NOMBRE_NEGOCIO_EN_USO` y 409 `CUPO_NEGOCIOS`.
 * El tope de negocios lo decide el backend: para `CUPO_NEGOCIOS` se usa su `message` (trae el número) y, si falta,
 * un texto sin número. Devuelve `null` si es otro error.
 */
export function mensajeErrorNuevoNegocio(err: unknown): string | null {
  const code = codigoError(err)
  if (code === 'NOMBRE_NEGOCIO_EN_USO') return TEXTO_NOMBRE_EN_USO
  if (code === 'CUPO_NEGOCIOS') {
    const r = (err as { response?: { data?: { message?: unknown } } }).response
    const m = r?.data?.message
    return typeof m === 'string' && m.trim() ? m.trim() : TEXTO_CUPO_NEGOCIOS
  }
  return null
}

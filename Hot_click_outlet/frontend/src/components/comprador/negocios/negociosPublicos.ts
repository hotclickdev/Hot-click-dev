import type { NegocioPublico, PlanPublico } from '@/services/negocioService'

/** Entradas "por tipo de negocio" del header y del directorio: alias de URL → plan público. */
export const PLANES_DIRECTORIO = [
  { alias: 'emprendimientos', plan: 'EMPRENDEDOR', nav: 'negocios.navEmprendimientos', titulo: 'negocios.tituloEmprendimientos' },
  { alias: 'pymes', plan: 'PYME', nav: 'negocios.navPymes', titulo: 'negocios.tituloPymes' },
  { alias: 'negocio-plus', plan: 'NEGOCIO_PLUS', nav: 'negocios.navNegocioPlus', titulo: 'negocios.tituloNegocioPlus' },
] as const satisfies ReadonlyArray<{ alias: string; plan: PlanPublico; nav: string; titulo: string }>

export type AliasPlan = (typeof PLANES_DIRECTORIO)[number]['alias']

export const ETIQUETA_PLAN: Record<PlanPublico, string> = {
  EMPRENDEDOR: 'negocios.planEmprendedor',
  PYME: 'negocios.planPyme',
  NEGOCIO_PLUS: 'negocios.planNegocioPlus',
}

export function rutaDirectorioPlan(alias: AliasPlan): string {
  return `/emprendimientos?plan=${alias}`
}

/** Comparativa pública de los tres planes. El alta sigue siendo una sola. */
export const RUTA_COMPARAR_PLANES = '/planes'

/** Landing larga de cada plan y el `?plan=` que entiende el alta. */
export const LANDING_POR_PLAN = {
  emprendimientos: { pagina: '/emprende', registro: 'emprendedor' },
  pymes: { pagina: '/para-pymes', registro: 'pyme' },
  'negocio-plus': { pagina: '/negocio-plus-plan', registro: 'negocio-plus' },
} as const satisfies Record<AliasPlan, { pagina: string; registro: 'emprendedor' | 'pyme' | 'negocio-plus' }>

export function rutaRegistroPlan(alias: AliasPlan): string {
  return `/registro-empresa?plan=${LANDING_POR_PLAN[alias].registro}`
}

/**
 * "Conocé los planes" dentro del directorio.
 * Todos y Emprendimientos abren los tres; Pymes y Negocio Plus abren su landing.
 */
export function rutaConocerPlanes(planParam: string | null | undefined): string {
  const plan = planDesdeParam(planParam)
  if (!plan || plan.alias === 'emprendimientos') return RUTA_COMPARAR_PLANES
  return LANDING_POR_PLAN[plan.alias].pagina
}

/** Fuera del directorio el banner abre la comparativa. Adentro respeta el chip activo. */
export function destinoBannerPlanes(pathname: string, search: string): string {
  if (pathname !== '/emprendimientos') return RUTA_COMPARAR_PLANES
  return rutaConocerPlanes(new URLSearchParams(search).get('plan'))
}

/** "Sin mensualidad" solo cuando el clic no entra directo a un plan de pago. */
export function bannerMuestraSinMensualidad(destino: string): boolean {
  return destino !== LANDING_POR_PLAN.pymes.pagina && destino !== LANDING_POR_PLAN['negocio-plus'].pagina
}

/** `?plan=` del directorio: solo alias conocidos; cualquier otro valor es "todos". */
export function planDesdeParam(valor: string | null | undefined) {
  return PLANES_DIRECTORIO.find((p) => p.alias === valor) ?? null
}

export function rutaTienda(negocio: Pick<NegocioPublico, 'slug'>): string {
  return `/tienda/${encodeURIComponent(negocio.slug)}`
}

/** Mínimo de letras para consultar negocios desde el buscador (evita una petición por tecla). */
export const MIN_LETRAS_BUSQUEDA_NEGOCIOS = 2

export function normalizarListaNegocios(data: unknown): NegocioPublico[] {
  if (!Array.isArray(data)) return []
  return data.filter((n): n is NegocioPublico => Boolean(n && typeof n === 'object' && (n as NegocioPublico).slug && (n as NegocioPublico).nombre))
}

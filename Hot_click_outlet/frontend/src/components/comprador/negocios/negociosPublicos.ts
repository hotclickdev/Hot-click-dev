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
  return `/negocios?plan=${alias}`
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

import { prefijoPorPlan } from '@/utils/planPaths'

/** Base `/emprendedor/productos/nuevo` (o PYME / Plus) según plan del tenant. */
export function rutaNuevoProductoSeller(planNombre: string | null | undefined): string {
  return `${prefijoPorPlan(planNombre)}/productos/nuevo`
}

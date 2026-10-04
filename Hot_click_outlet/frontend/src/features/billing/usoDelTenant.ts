import type { UsoTenant } from './bajarPlanHelpers'

type EstadoConUso = {
  usoProductos: number
  usoBodegas: number
  usoCajas: number
  usoUsuarios: number
}

/** Uso actual guardado en `tenantStore`, con el nombre de recurso que usa la regla de bajar de plan. */
export function usoDelTenant(estado: EstadoConUso): UsoTenant {
  return {
    productos: estado.usoProductos,
    bodegas: estado.usoBodegas,
    cajas: estado.usoCajas,
    usuarios: estado.usoUsuarios,
  }
}

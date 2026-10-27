import { PLAN_PRECIOS } from '../../config/planesPrecios'

/** Precios del plan Emprendedor. La comisión sale de PLAN_PRECIOS (fuente única del front). */
export const PLAN_EMPRENDEDOR = {
  mensualidad: 0,
  comisionPct: PLAN_PRECIOS.EMPRENDEDOR.comisionPct,
} as const

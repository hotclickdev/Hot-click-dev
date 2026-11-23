import { PLAN_PRECIOS } from '../../config/planesPrecios'

/**
 * Precios del plan Emprendedor. La comisión sale de PLAN_PRECIOS (fuente única del front). La mensualidad NO va acá:
 * sale del backend (`mensualidadUsdSinCupo`); un 0 fijo prometería «gratis» sin período ni precio posterior.
 */
export const PLAN_EMPRENDEDOR = {
  comisionPct: PLAN_PRECIOS.EMPRENDEDOR.comisionPct,
} as const

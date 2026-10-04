import type { RangoPresupuesto } from '@/config/rangosPresupuesto'
import { formatPrice } from '@/utils/format'

type Traducir = (clave: string, opciones?: Record<string, unknown>) => string

/** Texto de cada rango: «Hasta ₡10.000», «₡10.000 – ₡25.000», «Más de ₡100.000». */
export function etiquetasRangosPresupuesto(rangos: readonly RangoPresupuesto[], t: Traducir): { id: string; texto: string }[] {
  return rangos.map((r) => {
    if (r.hasta == null) return { id: r.id, texto: t('serviciosPage.form.presupuestoMas', { desde: formatPrice(r.desde) }) }
    if (r.desde <= 0) return { id: r.id, texto: t('serviciosPage.form.presupuestoHasta', { hasta: formatPrice(r.hasta) }) }
    return { id: r.id, texto: t('serviciosPage.form.presupuestoEntre', { desde: formatPrice(r.desde), hasta: formatPrice(r.hasta) }) }
  })
}

/** Etiquetas visibles del plan SaaS en el footer del sidebar. */
export const PLAN_LABELS = { EMPRENDEDOR: 'Emprendedor', PYME: 'PYME', NEGOCIO_PLUS: 'Negocio Plus' }

export const SECTION_COLORS = {
  'Catálogo':              'var(--hc-primary)',
  'Catálogo e inventario': 'var(--hc-primary)',
  'Ventas':                'var(--hc-link)',
  'POS':                   '#10b981',
  'Punto de Venta':        '#10b981',
  'Marketing':             '#f59e0b',
  'Sistema':               'var(--hc-muted)',
  'Mi negocio':            'var(--hc-link)',
}

/** Color de acento de una sección del sidebar. */
export function getSectionColor(section) {
  return SECTION_COLORS[section] || 'var(--hc-accent)'
}

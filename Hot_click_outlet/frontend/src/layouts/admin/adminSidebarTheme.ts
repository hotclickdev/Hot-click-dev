/** Etiquetas visibles del plan SaaS en el footer del sidebar. */
export const PLAN_LABELS: Record<string, string> = {
  EMPRENDEDOR: 'Emprendedor',
  PYME: 'PYME',
  NEGOCIO_PLUS: 'Negocio Plus',
}

export const SECTION_COLORS: Record<string, string> = {
  'Catálogo':              'var(--hc-primary)',
  'Catálogo e inventario': 'var(--hc-primary)',
  'Ventas':                'var(--hc-link)',
  'Abastecimiento':        '#06b6d4',
  'POS':                   '#10b981',
  'Punto de Venta':        '#10b981',
  'Finanzas':              '#22c55e',
  'Marketing':             '#f59e0b',
  'Plataforma':            'var(--hc-muted)',
  'Sistema':               'var(--hc-muted)',
  'IA':                    '#a78bfa',
  'Fiscal':                '#38bdf8',
  'Mi negocio':            'var(--hc-link)',
}

/** Color de acento de una sección del sidebar. */
export function getSectionColor(section?: string | null) {
  if (!section) return 'var(--hc-accent)'
  return SECTION_COLORS[section] || 'var(--hc-accent)'
}

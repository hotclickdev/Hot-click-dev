/** Etiquetas visibles del plan SaaS en el footer del sidebar. */
export const PLAN_LABELS: Record<string, string> = {
  EMPRENDEDOR: 'Emprendedor',
  PYME: 'PYME',
  NEGOCIO_PLUS: 'Negocio Plus',
}

/** Colores por ID estable de sección (admin IT + aliases Sistema). */
export const SECTION_COLORS: Record<string, string> = {
  catalogo: 'var(--hc-primary)',
  catalogoInventario: 'var(--hc-primary)',
  ventas: 'var(--hc-link)',
  vender: 'var(--hc-link)',
  abastecimiento: '#06b6d4',
  pos: '#10b981',
  puntoVenta: '#10b981',
  finanzas: '#22c55e',
  marketing: '#f59e0b',
  plataforma: 'var(--hc-muted)',
  sistema: 'var(--hc-muted)',
  ia: '#a78bfa',
  fiscal: '#38bdf8',
  miNegocio: 'var(--hc-link)',
  mas: 'var(--hc-muted)',
}

/** Color de acento de una sección del sidebar. */
export function getSectionColor(section?: string | null) {
  if (!section) return 'var(--hc-accent)'
  return SECTION_COLORS[section] || 'var(--hc-accent)'
}

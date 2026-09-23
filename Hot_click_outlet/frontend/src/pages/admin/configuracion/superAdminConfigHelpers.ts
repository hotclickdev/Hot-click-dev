export const LINKS_CONFIG_ADMIN = [
  { to: '/admin/categorias', label: 'Categorías del catálogo' },
  { to: '/admin/configuracion?seccion=politica', label: 'Política de moderación' },
  { to: '/admin/configuracion?seccion=pagos-metodos', label: 'Métodos de pago aceptados' },
  { to: '/admin/configuracion?seccion=alertas', label: 'Notificaciones del sistema' },
] as const

export function etiquetaComisionDesdePlanes(data: unknown): string {
  const lista = listaPlanes(data)
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue
    const pct = (item as { comisionPorcentaje?: unknown }).comisionPorcentaje
    if (typeof pct === 'number' && Number.isFinite(pct)) return `${pct}%`
    if (typeof pct === 'string' && pct.trim()) {
      return pct.trim().endsWith('%') ? pct.trim() : `${pct.trim()}%`
    }
  }
  return '—'
}

function listaPlanes(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data
    if (Array.isArray(inner)) return inner
  }
  return []
}

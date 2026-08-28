export const fmt     = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)
export const fmtDate = (d: string | number | Date | null | undefined) => d ? new Date(d).toLocaleDateString('es-CR') : '—'

export const SEGMENTOS = ['NUEVO', 'FRECUENTE', 'VIP', 'INACTIVO']
export const SEG_META: Record<string, { bg: string; text: string }>  = {
  NUEVO:     { bg: 'rgba(96,165,250,0.12)',  text: '#6490EA' },
  FRECUENTE: { bg: 'rgba(52,211,153,0.12)', text: '#34d399' },
  VIP:       { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  INACTIVO:  { bg: 'rgba(255,255,255,0.06)', text: 'var(--hc-muted)' },
}

export const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CR') : '—')

export const ESTADO_META = {
  PENDIENTE:  { label: 'Pendiente',  bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  PARCIAL:    { label: 'Parcial',    bg: 'rgba(96,165,250,0.12)',  text: '#6490EA' },
  RECIBIDA:   { label: 'Recibida',   bg: 'rgba(52,211,153,0.12)', text: '#34d399' },
  CANCELADA:  { label: 'Cancelada',  bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
}

export const FILTROS_COMPRAS = ['TODAS', 'PENDIENTE', 'PARCIAL', 'RECIBIDA', 'CANCELADA']

/** Formatea un monto en colones costarricenses. */
export const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export const METODOS = [
  { id: 'EFECTIVO',      label: 'Efectivo',              icon: '💵', desc: 'Calcula vuelto' },
  { id: 'TARJETA',      label: 'Tarjeta (manual)',       icon: '💳', desc: 'Sin datafono' },
  { id: 'SINPE',        label: 'SINPE',                  icon: '📱', desc: 'Transferencia móvil' },
  { id: 'TRANSFERENCIA',label: 'Transferencia',          icon: '🏦', desc: 'Banco' },
  { id: 'DATAFONO',     label: 'Datafono integrado',     icon: '🔌', desc: 'Próximamente', disabled: true },
]

export const SEG_COLOR = { NUEVO: '#6490EA', FRECUENTE: '#34d399', VIP: '#fbbf24', INACTIVO: '#A7B0BC' }

/** Formatea un monto en colones costarricenses. */
export const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export const METODOS = [
  { id: 'EFECTIVO', label: 'Efectivo', desc: 'Calcula vuelto' },
  { id: 'SINPE',    label: 'SINPE',    desc: 'Al número del negocio' },
  { id: 'TARJETA',  label: 'Tarjeta',  desc: 'QR a la pasarela' },
]

export const SEG_COLOR = { NUEVO: '#6490EA', FRECUENTE: '#34d399', VIP: '#fbbf24', INACTIVO: '#A7B0BC' }

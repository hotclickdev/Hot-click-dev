export const EVENTOS_DISPONIBLES = [
  { id: 'pedido.creado',    label: 'Pedido creado' },
  { id: 'pedido.pagado',    label: 'Pedido pagado' },
  { id: 'pedido.entregado', label: 'Pedido entregado' },
  { id: 'pedido.cancelado', label: 'Pedido cancelado' },
  { id: 'gift_card.canjeada', label: 'Gift card canjeada' },
  { id: 'plugin.test',     label: 'Test (siempre se envía)' },
]

export const ESTADO_STYLE = {
  ENVIADO:  'text-green-400 bg-green-400/10',
  FALLIDO:  'text-red-400 bg-red-400/10',
  PENDIENTE: 'text-amber-400 bg-amber-400/10',
}

export const FORM_VACIO = { nombre: '', descripcion: '', tipo: 'WEBHOOK', url: '', eventosSuscritos: '[]', secretoHmac: '' }

/** @param {string} value */
export function parseEventos(value) {
  try { return JSON.parse(value || '[]') } catch { return [] }
}

import { fmt, WHATSAPP } from './posPaymentConstants'

/** @returns {string} mensaje de error o '' si es válido */
export function validate({ nombre, telefono, needsAddress, direccion }) {
  if (!nombre.trim())    return 'El nombre es obligatorio'
  if (!telefono.trim())  return 'El teléfono es obligatorio'
  if (needsAddress && !direccion.trim()) return 'La dirección es obligatoria para el envío'
  return ''
}

export function buildNotas({ nombre, telefono, direccion, metodo, entrega }) {
  return [
    nombre    ? `Nombre: ${nombre}`       : '',
    telefono  ? `Tel: ${telefono}`        : '',
    direccion ? `Dir: ${direccion}`       : '',
    `Método: ${metodo}`,
    `Envío: ${entrega}`,
  ].filter(Boolean).join(' | ')
}

export function openSinpeWhatsApp({ pagoData, items, nombre, telefono, totalFinal }) {
  const lineas = (pagoData?._itemsSnapshot || items)
    .map(i => `• ${i.nombre ?? i.name} x${i.cantidad}`)
    .join('\n')
  const msg = encodeURIComponent(
    `Hola HotClick 👋\n\n*Comprobante SINPE Móvil*\n\n` +
    `Nombre: ${nombre || '(sin nombre)'}\n` +
    `Teléfono: ${telefono}\n` +
    (pagoData?.numeroPedido ? `Pedido: ${pagoData.numeroPedido}\n` : '') +
    `Monto: ₡${fmt(totalFinal)}\n\nProductos:\n${lineas}\n\n` +
    `_Comprobante adjunto. ¡Gracias!_`
  )
  globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
}

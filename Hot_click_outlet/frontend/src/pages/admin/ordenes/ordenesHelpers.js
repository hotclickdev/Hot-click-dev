export const FILTERS = ['Todos', 'PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO', 'ENTREGADO', 'COMPLETADO', 'CANCELADO']

export const ORD_PAGE_SIZE = 20

export const ESTADO_STYLE = {
  PENDIENTE:      { bg: '#f7ead2',                text: '#8a5a00', border: 'rgba(138,90,0,0.3)' },
  PAGADO:         { bg: 'rgba(23,71,168,0.14)',   text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.35)' },
  EN_PREPARACION: { bg: '#f7ead2',                text: '#8a5a00', border: 'rgba(138,90,0,0.3)' },
  LISTO_RETIRO:   { bg: '#e2f1e8',                text: '#1E7F4F', border: 'rgba(30,127,79,0.35)' },
  ENVIADO:        { bg: 'rgba(23,71,168,0.14)',   text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.35)' },
  ENTREGADO:      { bg: '#e2f1e8',                text: '#1E7F4F', border: 'rgba(30,127,79,0.35)' },
  COMPLETADO:     { bg: 'rgba(23,71,168,0.14)',   text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.35)' },
  CANCELADO:      { bg: 'rgba(220,38,38,0.1)',    text: '#a8291f', border: 'rgba(220,38,38,0.3)' },
}

export const ETAPAS_RETIRO = [
  { key: 'PENDIENTE',      labelKey: 'adminOrders.stepPending' },
  { key: 'PAGADO',         labelKey: 'adminOrders.stepPaid' },
  { key: 'EN_PREPARACION', labelKey: 'adminOrders.stepPrep' },
  { key: 'LISTO_RETIRO',   labelKey: 'adminOrders.stepReady' },
  { key: 'ENTREGADO',      labelKey: 'adminOrders.stepPickedUp' },
  { key: 'COMPLETADO',     labelKey: 'adminOrders.stepCompleted' },
]

export const ETAPAS_ENVIO = [
  { key: 'PENDIENTE',      labelKey: 'adminOrders.stepPending' },
  { key: 'PAGADO',         labelKey: 'adminOrders.stepPaid' },
  { key: 'EN_PREPARACION', labelKey: 'adminOrders.stepPrep' },
  { key: 'ENVIADO',        labelKey: 'adminOrders.stepShipped' },
  { key: 'ENTREGADO',      labelKey: 'adminOrders.stepDelivered' },
  { key: 'COMPLETADO',     labelKey: 'adminOrders.stepCompleted' },
]

export const METODOS_PAGO = ['SINPE', 'EFECTIVO', 'CONTRA_ENTREGA', 'TRANSFERENCIA']

export const METODOS_ENVIO = [
  { value: 'RETIRO_EN_TIENDA',   labelKey: 'adminOrders.pickupStoreLabel' },
  { value: 'ENVIO_A_DOMICILIO',  labelKey: 'adminOrders.homeDeliveryLabel' },
]

export const ESTADOS_INICIAL = ['PENDIENTE', 'PAGADO', 'EN_PREPARACION']

export const COLUMNAS_EXPORT_PEDIDOS = ['id', 'fecha', 'cliente', 'correo', 'estado', 'total', 'subtotal', 'envio', 'tipoEntrega', 'guia']

export const FORM_PEDIDO_INICIAL = {
  usuarioId: '',
  metodoEnvio: 'RETIRO_EN_TIENDA',
  metodoPago: 'SINPE',
  costoEnvio: '',
  estadoPedido: 'PENDIENTE',
  notas: '',
  items: [],
}

const inpPedido = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }

export const ESTILO_INPUT_PEDIDO = inpPedido

/** @param {unknown} data */
export function listaPedidosDesdeRespuesta(data) {
  const raw = data?.data ?? data
  return Array.isArray(raw) ? raw : raw?.content ?? []
}

/** @param {object[]} orders @param {string} filter @param {boolean} sortDesc */
export function pedidosFiltradosOrdenados(orders, filter, sortDesc) {
  return (filter === 'Todos' ? orders : orders.filter((o) => o.estado === filter))
    .slice()
    .sort((a, b) => {
      const da = new Date(a.fechaCreacion ?? a.fechaPedido ?? 0)
      const db = new Date(b.fechaCreacion ?? b.fechaPedido ?? 0)
      return sortDesc ? db - da : da - db
    })
}

/** @param {object[]} orders */
export function filasExportPedidos(orders) {
  return orders.map((o) => ({
    id: o.id,
    fecha: (o.fechaCreacion ?? '').slice(0, 10),
    cliente: o.nombreCliente ?? '',
    correo: o.clienteCorreo ?? '',
    estado: o.estadoPedido ?? '',
    total: o.totalPedido ?? 0,
    subtotal: o.subtotal ?? 0,
    envio: o.costoEnvio ?? 0,
    tipoEntrega: o.tipoEntrega ?? '',
    guia: o.numeroGuia ?? '',
  }))
}

/** @param {object[]} items */
export function subtotalItemsPedido(items) {
  return items.reduce((s, i) => s + (Number.parseInt(i.precioUnitario) || 0) * (Number.parseInt(i.cantidad) || 0), 0)
}

/** @param {object[]} items @param {object} prod */
export function agregarItemPedido(items, prod) {
  const id = prod.id ?? prod.productoId
  const nombre = prod.nombre ?? prod.nombreProducto
  const precio = prod.precio ?? prod.precioVenta
  if (items.find((i) => i.productoId === id)) {
    return items.map((i) => i.productoId === id ? { ...i, cantidad: i.cantidad + 1 } : i)
  }
  return [...items, { productoId: id, nombre, precio, cantidad: 1, precioUnitario: precio }]
}

/** @param {object} form @param {number} costoEnvioNum */
export function payloadPedidoManual(form, costoEnvioNum) {
  return {
    usuarioId: Number(form.usuarioId),
    bodegaId: 1,
    metodoEnvio: form.metodoEnvio,
    metodoPago: form.metodoPago,
    costoEnvio: costoEnvioNum,
    estadoPedido: form.estadoPedido,
    notas: form.notas || null,
    items: form.items.map((i) => ({
      productoId: i.productoId,
      cantidad: Number.parseInt(i.cantidad) || 1,
      precioUnitario: Number.parseInt(i.precioUnitario) || i.precio,
    })),
  }
}

/** @param {string} tel */
export function numeroWhatsAppCliente(tel) {
  const digits = String(tel).replace(/\D/g, '')
  return digits.startsWith('506') ? digits : `506${digits}`
}

/** @param {object} order @param {string} estado */
export function mensajeWhatsAppPedido(order, estado) {
  const productos = (order.items ?? []).map((i) => `• ${i.nombreProducto} ×${i.cantidad}`).join('\n')
  return [
    `Hola ${order.nombreCliente ?? ''}, te escribimos de *HotClick* sobre tu pedido *#${order.id}*.`,
    '',
    `Estado actual: *${order.estado ?? estado}*`,
    ...(productos ? ['\nProductos:', productos] : []),
    ...(order.numeroGuia ? [`\nGuía: *${order.numeroGuia}*`] : []),
    '',
    '¿Tenés alguna consulta? Con gusto te ayudamos.',
  ].join('\n')
}

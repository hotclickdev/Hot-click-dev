const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export function mapearProductosBusqueda(prodList) {
  return prodList.slice(0, 5).map(p => ({
    label: p.nombreProducto ?? p.nombre,
    sub: `SKU: ${p.sku ?? '—'} · Stock: ${p.stockActual ?? p.stock ?? 0}`,
    meta: `₡${fmt(p.precioEfectivo ?? p.precioVenta ?? p.precio)}`,
    icono: 'paquete', iconColor: 'rgba(23,71,168,',
    path: `/admin/productos`,
  }))
}

export function mapearPedidosBusqueda(pedidoList) {
  return pedidoList.slice(0, 3).map(p => ({
    label: `Pedido #${p.id} — ${p.numeroPedido ?? ''}`,
    sub: `${p.estadoPedido ?? ''} · ₡${fmt(p.totalPedido)}`,
    icono: 'lista', iconColor: 'rgba(52,211,153,',
    path: `/admin/pedidos`,
  }))
}

export function mapearClientesBusqueda(clienList) {
  return clienList.slice(0, 5).map(c => ({
    label: `${c.nombre ?? ''} ${c.apellidoPaterno ?? ''}`.trim(),
    sub: c.correo,
    meta: `${c.puntosFidelidad ?? 0} pts`,
    icono: 'clientes', iconColor: 'rgba(151,183,243,',
    path: `/admin/usuarios`,
  }))
}

export function queryParecePedido(query) {
  const q = query.trim()
  return /^\d+$/.test(q) || q.toUpperCase().startsWith('ORD')
}

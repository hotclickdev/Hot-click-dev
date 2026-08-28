export type ItemBusquedaGlobal = {
  label: string | undefined
  sub?: string
  meta?: string
  icono: string
  iconColor: string
  path: string
}

type ProductoBusqueda = {
  nombreProducto?: string
  nombre?: string
  sku?: string | null
  stockActual?: number
  stock?: number
  precioEfectivo?: number | null
  precioVenta?: number
  precio?: number
}

type PedidoBusqueda = {
  id?: number | string
  numeroPedido?: string
  estadoPedido?: string
  totalPedido?: number
}

type ClienteBusqueda = {
  nombre?: string
  apellidoPaterno?: string
  correo?: string
  puntosFidelidad?: number
}

const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export function mapearProductosBusqueda(prodList: unknown[]): ItemBusquedaGlobal[] {
  return prodList.slice(0, 5).map((raw) => {
    const p = raw as ProductoBusqueda
    return {
      label: p.nombreProducto ?? p.nombre,
      sub: `SKU: ${p.sku ?? '—'} · Stock: ${p.stockActual ?? p.stock ?? 0}`,
      meta: `₡${fmt(p.precioEfectivo ?? p.precioVenta ?? p.precio)}`,
      icono: 'paquete', iconColor: 'rgba(23,71,168,',
      path: `/admin/productos`,
    }
  })
}

export function mapearPedidosBusqueda(pedidoList: unknown[]): ItemBusquedaGlobal[] {
  return pedidoList.slice(0, 3).map((raw) => {
    const p = raw as PedidoBusqueda
    return {
      label: `Pedido #${p.id} — ${p.numeroPedido ?? ''}`,
      sub: `${p.estadoPedido ?? ''} · ₡${fmt(p.totalPedido)}`,
      icono: 'lista', iconColor: 'rgba(52,211,153,',
      path: `/admin/pedidos`,
    }
  })
}

export function mapearClientesBusqueda(clienList: unknown[]): ItemBusquedaGlobal[] {
  return clienList.slice(0, 5).map((raw) => {
    const c = raw as ClienteBusqueda
    return {
      label: `${c.nombre ?? ''} ${c.apellidoPaterno ?? ''}`.trim(),
      sub: c.correo,
      meta: `${c.puntosFidelidad ?? 0} pts`,
      icono: 'clientes', iconColor: 'rgba(151,183,243,',
      path: `/admin/usuarios`,
    }
  })
}

export function queryParecePedido(query: string) {
  const q = query.trim()
  return /^\d+$/.test(q) || q.toUpperCase().startsWith('ORD')
}

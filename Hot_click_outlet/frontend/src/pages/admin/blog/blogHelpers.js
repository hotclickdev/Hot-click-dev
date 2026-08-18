export const EMPTY_BLOG_FORM = { titulo: '', resumen: '', contenido: '', imagenUrl: '', publicado: false }

const MS_DIA = 86_400_000
const DIAS_TOP_PRODUCTO = 30
const ESTADOS_VENTA = new Set(['COMPLETADO', 'ENTREGADO', 'PAGADO'])

/** @param {object[]} ventas */
export function postSugeridoDeVentas(ventas) {
  const corte = Date.now() - DIAS_TOP_PRODUCTO * MS_DIA
  const map = {}
  ventas.forEach((v) => {
    if (!ESTADOS_VENTA.has(v.estado)) return
    if (new Date(v.fechaCreacion ?? 0).getTime() < corte) return
    acumularItemsPost(map, v.items ?? [])
  })
  return Object.values(map).sort((a, b) => b.ingreso - a.ingreso)[0] ?? null
}

function acumularItemsPost(map, items) {
  items.forEach((item) => {
    const id = item.producto?.id ?? item.productoId
    if (!id) return
    const nombre = item.producto?.nombreProducto ?? item.nombreProducto ?? `#${id}`
    const actual = map[id] ?? {
      id,
      nombre,
      ingreso: 0,
      imagenUrl: item.producto?.imagenPrincipalUrl ?? item.imagenUrl ?? '',
    }
    actual.ingreso += item.subtotalItem ?? ((item.cantidad ?? 1) * (item.precioUnitarioMomento ?? 0))
    map[id] = actual
  })
}

/** @param {object} producto */
export function formPostSugerido(producto) {
  return {
    titulo: `${producto.nombre}: lo más pedido este mes`,
    resumen: `${producto.nombre} es lo que más te están pidiendo. Publicá para que más gente lo vea.`,
    contenido: `${producto.nombre} está entre lo más pedido de tu negocio este mes. Disponible en tu tienda HotClick.`,
    imagenUrl: producto.imagenUrl ?? '',
    publicado: false,
  }
}

/** @param {string|null|undefined} d */
export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

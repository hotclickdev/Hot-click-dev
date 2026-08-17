export const DENOM = [
  { v: 50000, label: '₡50.000', color: '#c0392b', bg: 'rgba(192,57,43,0.15)' },
  { v: 20000, label: '₡20.000', color: '#27ae60', bg: 'rgba(39,174,96,0.15)'  },
  { v: 10000, label: '₡10.000', color: '#e67e22', bg: 'rgba(230,126,34,0.15)' },
  { v:  5000, label: '₡5.000',  color: '#2980b9', bg: 'rgba(41,128,185,0.15)' },
  { v:  2000, label: '₡2.000',  color: '#8e44ad', bg: 'rgba(142,68,173,0.15)' },
  { v:  1000, label: '₡1.000',  color: '#795548', bg: 'rgba(121,85,72,0.15)'  },
  { v:   500, label: '₡500',    color: '#9e9e9e', bg: 'rgba(158,158,158,0.15)'},
  { v:   100, label: '₡100',    color: '#ffc107', bg: 'rgba(255,193,7,0.15)'  },
  { v:    50, label: '₡50',     color: '#ffc107', bg: 'rgba(255,193,7,0.12)'  },
]

export const METODOS = [
  { id: 'EFECTIVO',      label: 'Efectivo',      iconId: 'efectivo',      color: '#34d399', desc: 'Pago en mano' },
  { id: 'SINPE',         label: 'SINPE Móvil',   iconId: 'sinpe',         color: '#6490EA', desc: 'SINPE Móvil' },
  { id: 'TARJETA',       label: 'Tarjeta',       iconId: 'tarjeta',       color: '#7aa3ff', desc: 'Crédito / Débito' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', iconId: 'transferencia', color: '#fbbf24', desc: 'Bancaria' },
]

/**
 * Formatea un monto POS sin prefijo ₡ (para inputs y plantillas que ya ponen ₡).
 * @param {number|null|undefined} n
 */
export function formatMontoPos(n) {
  return new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))
}

/** @param {number} total */
export function sugerirMontos(total) {
  const bases = [1000, 2000, 5000, 10000, 20000, 50000]
  const out = []
  for (const b of bases) {
    const s = Math.ceil(total / b) * b
    if (s >= total && !out.includes(s) && out.length < 4) out.push(s)
  }
  return out
}

/** @param {number} monto */
export function descomponer(monto) {
  const r = []; let rest = Math.round(monto)
  for (const d of DENOM) {
    if (rest >= d.v) { const q = Math.floor(rest / d.v); r.push({ ...d, q }); rest -= q * d.v }
  }
  return r
}

/**
 * Agrega un producto al carrito POS o incrementa cantidad si ya está.
 * @param {object[]} prev
 * @param {object} producto
 * @returns {object[]}
 */
export function agregarProductoAlCarrito(prev, producto) {
  const id = producto.id ?? producto.idProducto
  const ex = prev.find(i => i.id === id)
  if (ex) return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i)
  return [...prev, {
    id,
    nombre:        producto.nombreProducto ?? producto.nombre,
    imagen:        producto.imagenPrincipalUrl ?? null,
    precio:        producto.precioEfectivo ?? producto.precioVenta,
    precioOriginal: producto.precioEfectivo ?? producto.precioVenta,
    stockActual:   producto.stockActual ?? 0,
    cantidad:      1,
  }]
}

export function normalizeProduct(p) {
  return {
    id:             p.id_producto    ?? p.id,
    nombre:         p.nombre_producto ?? p.nombre,
    descripcionCorta: p.descripcion_corta ?? p.descripcionCorta,
    precio:         p.precio_venta   ?? p.precio,
    precioOferta:   p.precio_oferta  ?? p.precioOferta ?? null,
    imagenUrl:      p.imagen_principal_url ?? p.imagenUrl,
    sku:            p.sku            ?? '',
    stock:          p.stock_actual   ?? p.stock ?? 99,
    similarity:     p.similarity,
  }
}

/** Detects if current time is outside Costa Rica business hours (8am–8pm). */
export function isAfterHours() {
  const crHour = new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica', hour: 'numeric', hour12: false })
  const h = Number.parseInt(crHour, 10)
  return h < 8 || h >= 20
}

export const removeMsg = (msg) => (list) => list.filter(x => x !== msg)

export const MSG_CSS_ID = 'hc-ai-msg-css'

if (typeof document !== 'undefined' && !document.getElementById(MSG_CSS_ID)) {
  const s = document.createElement('style')
  s.id = MSG_CSS_ID
  s.textContent = `@keyframes ai-msg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`
  document.head.appendChild(s)
}

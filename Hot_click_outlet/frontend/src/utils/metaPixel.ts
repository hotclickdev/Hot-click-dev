/**
 * Meta Pixel desactivado por decisión del dueño (sin publicidad, 10-oct-2026): no hay loader ni init,
 * y la CSP ya no permite connect.facebook.net. Solo queda la lectura de cookies _fbp/_fbc, que sin
 * pixel nunca existen (devuelve {}), para no romper el contrato de checkout.
 */
export const META_PIXEL_HABILITADO = false

/** Lee cookies _fbp / _fbc para CAPI. */
export function readMetaCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {}
  const out: { fbp?: string; fbc?: string } = {}
  for (const part of document.cookie.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    const v = rest.join('=')
    if (k === '_fbp') out.fbp = v
    if (k === '_fbc') out.fbc = v
  }
  return out
}

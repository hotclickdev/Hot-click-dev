/**
 * S4-22 · Privacidad del `estadoPagoToken` (#207) en la página pública de estado del pago.
 * - `<meta name="referrer" content="no-referrer">` mientras la página está montada: el token no viaja en el Referer.
 * - El token se lee una vez de `?token=`, se guarda en sessionStorage (por pedido, solo esta pestaña) y se quita de la
 *   URL visible con `history.replaceState`. Al refrescar se toma de sessionStorage, así que el refresco sigue andando.
 */
type MetaLike = { getAttribute(n: string): string | null; setAttribute(n: string, v: string): void; remove(): void }
type DocLike = {
  head: { appendChild(n: unknown): unknown }
  querySelector(sel: string): MetaLike | null
  createElement(tag: 'meta'): MetaLike
}
type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** Pone la política no-referrer y devuelve la función que la deshace al desmontar. */
export function ponerMetaNoReferrer(doc: DocLike): () => void {
  const existente = doc.querySelector('meta[name="referrer"]')
  if (existente) {
    const previo = existente.getAttribute('content')
    existente.setAttribute('content', 'no-referrer')
    return () => { if (previo == null) existente.remove(); else existente.setAttribute('content', previo) }
  }
  const meta = doc.createElement('meta')
  meta.setAttribute('name', 'referrer')
  meta.setAttribute('content', 'no-referrer')
  doc.head.appendChild(meta)
  return () => meta.remove()
}

export const claveTokenEstado = (numero: string) => `hc.estadoPago.${numero}`

/** Token de la URL (y lo guarda) o, si ya se quitó de la URL, el guardado para este pedido. */
export function tokenEstadoPago(numero: string, search: string, storage: StorageLike | null): string | null {
  const deUrl = new URLSearchParams(search).get('token')
  if (deUrl) {
    try { storage?.setItem(claveTokenEstado(numero), deUrl) } catch { /* sin storage: el token queda solo en memoria */ }
    return deUrl
  }
  try { return storage?.getItem(claveTokenEstado(numero)) ?? null } catch { return null }
}

/** La misma URL sin el parámetro `token` (conserva los demás y el hash). */
export function urlSinToken(pathname: string, search: string, hash = ''): string {
  const p = new URLSearchParams(search)
  p.delete('token')
  const q = p.toString()
  return `${pathname}${q ? `?${q}` : ''}${hash}`
}

/** rel para todo enlace que sale de esta página. */
export const REL_SIN_REFERRER = 'noopener noreferrer'

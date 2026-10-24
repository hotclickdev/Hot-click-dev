/** El pago con tarjeta solo redirige al checkout hospedado de ONVO: https, onvopay.com o un subdominio, sin usuario ni puerto. */
const DOMINIO_ONVO = 'onvopay.com'

export const MENSAJE_URL_PAGO_INVALIDA = 'No pudimos abrir la página de pago de ONVO. Intentá de nuevo en un momento.'

export function esUrlPagoOnvo(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false
  try {
    const u = new URL(url.trim())
    const host = u.hostname.toLowerCase()
    const hostOnvo = host === DOMINIO_ONVO || host.endsWith(`.${DOMINIO_ONVO}`)
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && hostOnvo
  } catch {
    return false
  }
}

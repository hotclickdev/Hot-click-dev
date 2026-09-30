import { armarPayloadEmbudo, type PasoEmbudo } from '@/utils/embudoPayload'

const CLAVE_SESION = 'hotclick-embudo-sesion'

const MAPA: Record<string, { paso: PasoEmbudo; motivo?: string }> = {
  visita_tienda: { paso: 'VISITA' },
  producto_visto: { paso: 'PRODUCTO' },
  carrito_agregado: { paso: 'CARRITO' },
  checkout_visto: { paso: 'CHECKOUT' },
  pago_intentado: { paso: 'PAGO_INTENTO' },
  pago_fallido: { paso: 'PAGO_INTENTO', motivo: 'PAGO_FALLIDO' },
  pago_cancelado: { paso: 'PAGO_INTENTO', motivo: 'PAGO_CANCELADO' },
  busqueda_sin_resultados: { paso: 'VISITA', motivo: 'BUSQUEDA_VACIA' },
  checkout_bloqueado: { paso: 'CHECKOUT' },
}

let ultimaFirma = ''

function claveSesion(): string | null {
  try {
    const guardada = localStorage.getItem(CLAVE_SESION)
    if (guardada && !guardada.includes('@')) return guardada
    if (typeof crypto.randomUUID !== 'function') return null
    const nueva = crypto.randomUUID()
    localStorage.setItem(CLAVE_SESION, nueva)
    return nueva
  } catch (err) {
    console.error('[embudo] sesión', err)
    return null
  }
}

function montoDe(data: Record<string, unknown>): number | null {
  const monto = data.monto
  return typeof monto === 'number' && Number.isInteger(monto) ? monto : null
}

function motivoDe(evento: string, data: Record<string, unknown>, fijo?: string): string | null {
  if (fijo) return fijo
  if (evento !== 'checkout_bloqueado') return null
  return typeof data.motivo === 'string' ? data.motivo : null
}

/** Manda el paso al backend solo si cambió. No incluye la búsqueda ni otros textos. */
export function reportarEmbudo(evento: string, data: Record<string, unknown>) {
  const mapeado = MAPA[evento]
  if (!mapeado) return
  const sessionKey = claveSesion()
  if (!sessionKey) return
  const payload = armarPayloadEmbudo(
    sessionKey,
    mapeado.paso,
    motivoDe(evento, data, mapeado.motivo),
    montoDe(data),
  )
  if (!payload) return
  const firma = `${payload.paso}|${payload.motivo ?? ''}|${payload.monto ?? ''}`
  if (firma === ultimaFirma) return
  ultimaFirma = firma
  void fetch('/api/public/embudo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch((err: unknown) => {
    console.error('[embudo]', err)
  })
}

import { paymentService } from '@/services/paymentService'

export type DestinoTilopay = 'exito' | 'cancelado'

export type ConfirmarTilopayFn = (
  numeroPedido: string,
  queryParams: Record<string, string>,
) => Promise<{ data: { estadoPago?: string; estado?: string; message?: string } }>

/** Serializa todos los query params del redirect Tilopay. */
export function paramsDesdeSearch(search: string): Record<string, string> {
  const crudo = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(crudo || '')
  const out: Record<string, string> = {}
  params.forEach((valor, clave) => {
    out[clave] = valor
  })
  return out
}

export function numeroPedidoTilopay(params: Record<string, string>): string | null {
  const bruto = (params.order || params.orderNumber || params.numeroPedido || '').trim()
  return bruto.length > 0 ? bruto : null
}

export function motivoDesdeParams(params: Record<string, string>): string {
  return (params.description || params.motivo || params.message || '').trim()
}

function esCapturado(data: { estadoPago?: string; estado?: string } | undefined): boolean {
  if (!data) return false
  const estado = data.estadoPago || data.estado || ''
  return estado === 'CAPTURADO' || estado === 'PAGADO' || estado === 'APPROVED'
}

/** Códigos típicos Tilopay: 1 = aprobado. */
export function codigoTilopayOk(code: string | undefined): boolean {
  if (!code) return false
  return code === '1' || code === '00' || code.toLowerCase() === 'approved'
}

/**
 * Confirma con el backend y decide destino. Si falla la red pero el code es ok,
 * aún preferimos cancelado para que el operador revise (el backend es fuente de verdad).
 */
export async function resolverRespuestaTilopay(
  search: string,
  confirmar: ConfirmarTilopayFn = (n, q) => paymentService.confirmarTilopay(n, q),
): Promise<{ destino: DestinoTilopay; numeroPedido: string | null; motivo: string }> {
  const params = paramsDesdeSearch(search)
  const numeroPedido = numeroPedidoTilopay(params)
  const motivo = motivoDesdeParams(params)

  if (!numeroPedido) {
    return { destino: 'cancelado', numeroPedido: null, motivo: motivo || 'Falta el número de pedido' }
  }

  try {
    const { data } = await confirmar(numeroPedido, params)
    if (esCapturado(data)) {
      return { destino: 'exito', numeroPedido, motivo }
    }
    const estado = data?.estadoPago || data?.estado || ''
    if (!estado && codigoTilopayOk(params.code)) {
      return { destino: 'exito', numeroPedido, motivo }
    }
    return {
      destino: 'cancelado',
      numeroPedido,
      motivo: motivo || data?.message || 'El pago no fue confirmado',
    }
  } catch (err: unknown) {
    const msg = mensajeErrorConfirmar(err)
    return {
      destino: 'cancelado',
      numeroPedido,
      motivo: motivo || msg || 'No se pudo confirmar el pago',
    }
  }
}

function mensajeErrorConfirmar(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return ''
  const data = (err as { response?: { data?: { message?: string } | string } }).response?.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object' && data.message) return data.message
  return ''
}

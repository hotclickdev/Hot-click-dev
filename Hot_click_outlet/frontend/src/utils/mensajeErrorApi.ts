type ApiErrorBody = {
  message?: unknown
  error?: unknown
  data?: unknown
}

function textoMensaje(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() !== '' ? val : undefined
}

function extraerMensajeBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const payload = body as ApiErrorBody

  const topLevel = textoMensaje(payload.message)
  if (topLevel) return topLevel

  if (payload.data && typeof payload.data === 'object' && payload.data !== null) {
    const nested = textoMensaje((payload.data as { message?: unknown }).message)
    if (nested) return nested
  }

  return textoMensaje(payload.error)
}

/** Extrae message de errores axios/API; con fallback siempre string. */
export function mensajeErrorApi(err: unknown, fallback: string): string
export function mensajeErrorApi(err: unknown, fallback?: string): string | undefined
export function mensajeErrorApi(err: unknown, fallback?: string): string | undefined {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data
    const fromApi = extraerMensajeBody(data)
    if (fromApi) return fromApi
  }

  if (err instanceof Error) {
    const msg = err.message.trim()
    if (msg) return msg
  }

  return fallback
}

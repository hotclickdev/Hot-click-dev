interface ErrorHttp {
  response?: { status?: number; data?: { message?: string } }
}

/** 503 = HotClick todavía no creó la app de Meta; 400/403/409/502 traen un mensaje ya redactado para la persona. */
export function mensajeDeConexion(e: unknown, generico: string, pendiente: string): string {
  const r = (e as ErrorHttp | null)?.response
  if (r?.status === 503) return pendiente
  const msg = r?.data?.message
  if (typeof msg === 'string' && msg.trim() && [400, 403, 409, 502].includes(r?.status ?? 0)) return msg
  return generico
}

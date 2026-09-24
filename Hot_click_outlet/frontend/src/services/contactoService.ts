/**
 * Formulario público de contacto. Fetch a propósito (sin JWT):
 * el interceptor de api adjuntaría token si hay sesión.
 */
export type ContactoPayload = {
  nombre: string
  correo: string
  mensaje: string
  turnstileToken?: string
}

function mensajeErrorContacto(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error: unknown }).error
    if (typeof err === 'string' && err.trim()) return err
  }
  return fallback
}

export async function enviarContacto(form: ContactoPayload) {
  const { turnstileToken, ...campos } = form
  const body = {
    ...campos,
    ...(turnstileToken ? { turnstileToken } : {}),
  }
  const res = await fetch('/api/contacto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) return
  let mensaje = res.statusText || 'Error al enviar el formulario'
  try {
    const data: unknown = await res.json()
    mensaje = mensajeErrorContacto(data, mensaje)
  } catch {
    // body no JSON
  }
  throw new Error(mensaje)
}

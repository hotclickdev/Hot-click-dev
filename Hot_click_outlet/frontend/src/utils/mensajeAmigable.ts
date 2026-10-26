/**
 * Mensaje de error apto para mostrar en pantalla (español CR, voseo).
 * Usa el mensaje del backend (response.data.message|error) si es texto de usuario;
 * nunca muestra `err.message` crudo de JS/axios/navegador (p. ej. «Network Error»,
 * «Request failed with status code 500», «NotAllowedError: ...»).
 */
const PATRON_TECNICO =
  /exception|status code|network error|timeout of|failed to fetch|undefined|null|NotAllowedError|AbortError|SecurityError|InvalidStateError|stack|\bat [\w.$]+ \(|^\w+Error\b|https?:\/\//i

function texto(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() !== '' ? val.trim() : undefined
}

export function esMensajeTecnico(msg: string): boolean {
  return PATRON_TECNICO.test(msg)
}

export function mensajeAmigable(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: { message?: unknown; error?: unknown } } }).response?.data
    const delBackend = texto(data?.message) ?? texto(data?.error)
    if (delBackend && !esMensajeTecnico(delBackend)) return delBackend
  }
  return fallback
}

/** El usuario canceló o dejó vencer el diálogo de WebAuthn (llave / huella). */
export function esCancelacionWebAuthn(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const { name, message } = err as { name?: unknown; message?: unknown }
  if (name === 'NotAllowedError' || name === 'AbortError') return true
  return typeof message === 'string' && /cancel|NotAllowedError/i.test(message)
}

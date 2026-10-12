/**
 * Clave publicable de Clerk en runtime.
 * El `static/` versionado se compila sin `VITE_*`, así que en producción la clave llega del API
 * (`GET /api/public/auth-config`). Si el build sí trae `VITE_CLERK_PUBLISHABLE_KEY`, gana esa.
 */
const CLAVE_BUILD = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) || ''
const ESPERA_MS = 4000

let pendiente: Promise<string | null> | null = null

export function esClavePublicableClerk(v: unknown): v is string {
  return typeof v === 'string' && /^pk_(live|test)_[A-Za-z0-9+/=_-]+$/.test(v)
}

export async function pedirClaveClerk(fetcher: typeof fetch = fetch): Promise<string | null> {
  const ctrl = new AbortController()
  const reloj = setTimeout(() => ctrl.abort(), ESPERA_MS)
  try {
    const res = await fetcher('/api/public/auth-config', { signal: ctrl.signal, credentials: 'omit' })
    if (!res.ok) return null
    const json: unknown = await res.json().catch(() => null)
    const clave = json && typeof json === 'object' ? (json as { clerkPublishableKey?: unknown }).clerkPublishableKey : null
    return esClavePublicableClerk(clave) ? clave : null
  } catch {
    return null
  } finally {
    clearTimeout(reloj)
  }
}

/** Una sola petición por carga de página. */
export function cargarClaveClerk(): Promise<string | null> {
  if (CLAVE_BUILD) return Promise.resolve(CLAVE_BUILD)
  pendiente ??= pedirClaveClerk()
  return pendiente
}

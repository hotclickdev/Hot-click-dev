import { RUTA_INVITACION } from '@/utils/sanitizarUrl'

/**
 * Token de una invitación de equipo (credencial de un solo uso). Nunca va en el path ni en la query de la SPA:
 * el enlace del correo es `/equipo/invitacion#t=<token>`. Al cargar se lee, se guarda EN MEMORIA y la barra de
 * direcciones se limpia YA con `history.replaceState` (queda `/equipo/invitacion`, sin hash ni token).
 *
 * Para ir a iniciar sesión (cuenta activa) NO se pone en la URL: se guarda en `sessionStorage` solo para ese salto,
 * con vencimiento corto, y se borra al leerlo (un solo uso), al aceptar o al salir.
 */

const CLAVE_SS = 'hc-inv-token'
const VIGENCIA_SS_MS = 15 * 60 * 1000
const FORMATO = /^[A-Za-z0-9_-]{16,100}$/

let enMemoria: string | null = null

function valido(t: string | null | undefined): string | null {
  return t && FORMATO.test(t) ? t : null
}

/** Extrae el token del hash (`#t=`), de la query (`?t=`/`?token=`) o del path viejo `/equipo/invitacion/<token>`. */
export function extraerTokenDeUbicacion(loc: Pick<Location, 'pathname' | 'search' | 'hash'>): string | null {
  const porHash = new URLSearchParams(loc.hash.replace(/^#/, '')).get('t')
  const q = new URLSearchParams(loc.search)
  const porPath = /^\/equipo\/invitacion\/([^/?#]+)/.exec(loc.pathname)?.[1]
  let decodificado: string | undefined
  try { decodificado = porPath ? decodeURIComponent(porPath) : undefined } catch { decodificado = undefined }
  return valido(porHash) ?? valido(q.get('t')) ?? valido(q.get('token')) ?? valido(decodificado)
}

/**
 * Si la URL actual trae un token de invitación, lo guarda en memoria y limpia la barra de direcciones
 * (`/equipo/invitacion`, sin hash ni query). Devuelve true si capturó uno. Seguro de llamar varias veces.
 */
export function capturarTokenDeUrl(win: Pick<Window, 'location' | 'history'> = globalThis): boolean {
  const { pathname, search, hash } = win.location
  const esInvitacion = pathname === RUTA_INVITACION || pathname.startsWith(`${RUTA_INVITACION}/`)
  if (!esInvitacion) return false
  const token = extraerTokenDeUbicacion({ pathname, search, hash })
  const traeAlgo = hash !== '' || /[?&](?:t|token)=/.test(search) || pathname !== RUTA_INVITACION
  if (token) enMemoria = token
  if (traeAlgo) {
    try { win.history.replaceState(win.history.state, '', RUTA_INVITACION) } catch { /* el sanitizado de analítica lo cubre */ }
  }
  return token !== null
}

/** Token capturado (memoria) o, si venimos de iniciar sesión, el guardado para ese salto (se borra al leerlo). */
export function tomarToken(): string | null {
  if (enMemoria) return enMemoria
  try {
    const crudo = sessionStorage.getItem(CLAVE_SS)
    sessionStorage.removeItem(CLAVE_SS) // un solo uso
    if (!crudo) return null
    const { t, exp } = JSON.parse(crudo) as { t?: string; exp?: number }
    if (!valido(t) || typeof exp !== 'number' || exp < Date.now()) return null
    enMemoria = t as string
    return enMemoria
  } catch {
    return null
  }
}

/** Antes de ir a /login: guarda el token para el regreso SIN ponerlo en path ni query. */
export function guardarParaLogin(token: string): void {
  try { sessionStorage.setItem(CLAVE_SS, JSON.stringify({ t: token, exp: Date.now() + VIGENCIA_SS_MS })) } catch { /* sin storage: tendrá que usar el enlace de nuevo */ }
}

/** Al aceptar o al salir de la página: no queda rastro. */
export function olvidarToken(): void {
  enMemoria = null
  try { sessionStorage.removeItem(CLAVE_SS) } catch { /* nada que borrar */ }
}

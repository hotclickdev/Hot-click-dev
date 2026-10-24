/**
 * QA4-004: paso del código de verificación de registro, compartido por /registro y /login.
 * Solo se guarda el correo (nunca el código ni la cédula) en sessionStorage, para que un
 * remontaje o recarga de /registro vuelva al paso del código en vez de a un formulario vacío.
 */
import { statusErrorAuth } from './authHelpers'

export const CLAVE_CORREO_PENDIENTE = 'hc-registro-correo-pendiente'

type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function almacen(): Almacen | null {
  try { return globalThis.sessionStorage ?? null } catch { return null }
}

export function guardarCorreoPendiente(correo: string, store: Almacen | null = almacen()): void {
  try { store?.setItem(CLAVE_CORREO_PENDIENTE, correo.trim().toLowerCase()) } catch { /* sin storage */ }
}

export function leerCorreoPendiente(store: Almacen | null = almacen()): string {
  try { return store?.getItem(CLAVE_CORREO_PENDIENTE) ?? '' } catch { return '' }
}

export function limpiarCorreoPendiente(store: Almacen | null = almacen()): void {
  try { store?.removeItem(CLAVE_CORREO_PENDIENTE) } catch { /* sin storage */ }
}

export type PasoRegistro = 'form' | 'verify'

/** Paso con el que arranca /registro: si ya se envió un código en esta pestaña, el del código. */
export function pasoInicialRegistro(store: Almacen | null = almacen()): PasoRegistro {
  return leerCorreoPendiente(store) ? 'verify' : 'form'
}

/**
 * El login responde 403 "Verificá tu correo…" solo con la contraseña correcta de una cuenta PENDIENTE
 * (el bloqueo por intentos también es 403, pero dice "bloqueada").
 */
export function esCuentaPendiente(status: number | undefined, mensaje: string): boolean {
  const m = (mensaje || '').toLowerCase()
  return status === 403 && m.includes('verific') && !m.includes('bloquead')
}

export type ResultadoReenvio = 'enviado' | 'limite' | 'error'

/**
 * Reenvía con solo el correo. El backend responde igual exista o no la cuenta;
 * acá solo distinguimos el rate limit (429) de un fallo de red.
 */
export async function reenviarCodigoRegistro(
  correo: string,
  enviar: (data: { correo: string }) => Promise<unknown>,
): Promise<ResultadoReenvio> {
  try {
    await enviar({ correo: correo.trim().toLowerCase() })
    return 'enviado'
  } catch (err: unknown) {
    return statusErrorAuth(err) === 429 ? 'limite' : 'error'
  }
}

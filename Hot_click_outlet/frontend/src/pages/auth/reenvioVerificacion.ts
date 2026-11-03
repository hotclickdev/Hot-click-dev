/** QA4-004: segundos entre reenvíos del correo de verificación desde /login. */
export const COOLDOWN_REENVIO_SEG = 60

/** El backend responde 403 «Verificá tu correo para activar la cuenta.» a una cuenta PENDIENTE. */
export function esCuentaSinVerificar(status: number | undefined, msg: string): boolean {
  return status === 403 && /verific[aá] tu correo/i.test(msg)
}

/** QA4-004: paso de /login donde se escribe el código (reutiliza RegisterVerifyStep de /registro). */
export const PASO_VERIFICAR_CORREO = 'verificar-correo'

export type ResultadoAccion<T = undefined> = { ok: true; data?: T } | { ok: false; mensaje: string }

type ErrorConMensaje = { response?: { data?: { message?: unknown } } }

function mensajeDe(err: unknown, porDefecto: string): string {
  const m = (err as ErrorConMensaje | null)?.response?.data?.message
  return typeof m === 'string' && m.trim() ? m : porDefecto
}

/**
 * QA4-013 (fail-closed): solo es éxito si el backend respondió 2xx. Un 429 (tope de códigos) o
 * un 503 (no se pudo mandar el correo) se muestran tal cual, nunca como «te enviamos».
 */
export async function reenviarCodigo(
  enviar: (correo: string) => Promise<unknown>, correo: string, msgError: string,
): Promise<ResultadoAccion> {
  try {
    await enviar(correo.trim().toLowerCase())
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, mensaje: mensajeDe(err, msgError) }
  }
}

/** QA4-004: verifica el código desde /login con el mismo endpoint que /registro. */
export async function verificarCodigoCuenta<T>(
  verificar: (correo: string, codigo: string) => Promise<{ data: unknown }>,
  correo: string, codigo: string, msgCodigoInvalido: string, msgError: string,
): Promise<ResultadoAccion<T>> {
  const limpio = codigo.replace(/\D/g, '')
  if (limpio.length !== 6) return { ok: false, mensaje: msgCodigoInvalido }
  try {
    const res = await verificar(correo.trim().toLowerCase(), limpio)
    const data = (res?.data as { data?: T } | undefined)?.data
    return { ok: true, data }
  } catch (err: unknown) {
    return { ok: false, mensaje: mensajeDe(err, msgError) }
  }
}

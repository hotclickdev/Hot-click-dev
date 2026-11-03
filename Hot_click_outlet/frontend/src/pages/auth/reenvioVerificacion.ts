/** QA4-004: segundos entre reenvíos del correo de verificación desde /login. */
export const COOLDOWN_REENVIO_SEG = 60

/** El backend responde 403 «Verificá tu correo para activar la cuenta.» a una cuenta PENDIENTE. */
export function esCuentaSinVerificar(status: number | undefined, msg: string): boolean {
  return status === 403 && /verific[aá] tu correo/i.test(msg)
}

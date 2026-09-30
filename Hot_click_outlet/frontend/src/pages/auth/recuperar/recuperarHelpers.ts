/** Largo del código que manda el backend (OtpService, 6 dígitos). */
export const CODIGO_LARGO = 6

/** Vencimiento del código RESET_PASSWORD en hot_click_tipo_otp_tb (300 s). */
export const CODIGO_VENCE_MINUTOS = 5

/** Espera antes de permitir reenviar el código (el backend además limita 3 cada 10 min). */
export const REENVIO_SEGUNDOS = 60

/** Mismo rango que valida el backend (AuthSupport.esContrasenaRecuperacionValida). */
export const CONTRASENA_MIN = 8
export const CONTRASENA_MAX = 128

export type Paso = 'correo' | 'codigo' | 'nueva'

export const PASOS: Paso[] = ['correo', 'codigo', 'nueva']

export type RequisitosContrasena = {
  largo: boolean
  distintaDelCorreo: boolean
  combinada: boolean
}

/** Requisitos que muestra el Figma 44:1614. Los dos primeros son obligatorios; el tercero es sugerencia. */
export function requisitosContrasena(contrasena: string, correo: string): RequisitosContrasena {
  return {
    largo: contrasena.length >= CONTRASENA_MIN && contrasena.length <= CONTRASENA_MAX,
    distintaDelCorreo: contrasena.length > 0
      && contrasena.trim().toLowerCase() !== correo.trim().toLowerCase(),
    combinada: /\p{L}/u.test(contrasena) && /\d/.test(contrasena) && /[^\p{L}\d\s]/u.test(contrasena),
  }
}

export function contrasenaAceptable(contrasena: string, correo: string): boolean {
  const r = requisitosContrasena(contrasena, correo)
  return r.largo && r.distintaDelCorreo
}

/** Solo dígitos, hasta 6 (sirve para pegar "482 913" o "Código: 482913"). */
export function normalizarCodigo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, CODIGO_LARGO)
}

/** 42 → "0:42", 75 → "1:15". */
export function formatearCuentaRegresiva(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Correo que viene en location.state desde el login, si es un string. */
export function correoDesdeEstado(state: unknown): string {
  if (!state || typeof state !== 'object' || !('correo' in state)) return ''
  const correo = (state as { correo?: unknown }).correo
  return typeof correo === 'string' ? correo : ''
}

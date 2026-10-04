export const CLAVE_DECLARA_MAYORIA = 'hotclick-declara-mayoria-edad'
export const MENSAJE_MAYORIA_EDAD = 'HotClick solo admite personas mayores de 18 años.'

export function guardarDeclaraMayoriaEdad(declara: boolean): void {
  if (typeof sessionStorage === 'undefined') return
  if (declara) sessionStorage.setItem(CLAVE_DECLARA_MAYORIA, '1')
  else sessionStorage.removeItem(CLAVE_DECLARA_MAYORIA)
}

export function leoDeclaraMayoriaEdad(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(CLAVE_DECLARA_MAYORIA) === '1'
}

export function esErrorMayoriaEdad(mensaje: string | undefined): boolean {
  return Boolean(mensaje && mensaje.includes(MENSAJE_MAYORIA_EDAD))
}

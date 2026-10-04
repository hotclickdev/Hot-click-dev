export type PasoRegistro = 'intencion' | 'correo' | 'datos'

/** Paso anterior del alta de comprador. `null` = salir a ingresar. */
export function pasoAnteriorRegistro(paso: PasoRegistro): PasoRegistro | null {
  if (paso === 'datos') return 'correo'
  if (paso === 'correo') return 'intencion'
  return null
}

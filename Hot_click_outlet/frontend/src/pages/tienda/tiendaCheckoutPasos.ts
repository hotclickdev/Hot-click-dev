import {
  METODO_ENVIO_DOMICILIO,
  MSG_DIRECCION_DOMICILIO,
  MSG_TELEFONO,
  faltaTelefono,
} from './tiendaCheckoutValidacion'

export const METODO_PAGO_EFECTIVO = 'EFECTIVO'

export type MetodoOpcion = Readonly<{ value: string; label: string }>

/** Efectivo no se ofrece con envío a domicilio (contra entrega: REQUIERE_DECISIÓN). */
export function metodosPagoVisibles(metodoEnvio: string, todos: readonly MetodoOpcion[]): MetodoOpcion[] {
  if (metodoEnvio !== METODO_ENVIO_DOMICILIO) return [...todos]
  return todos.filter((m) => m.value !== METODO_PAGO_EFECTIVO)
}

export function pagoTrasCambioEnvio(metodoEnvio: string, metodoPago: string): string {
  if (metodoEnvio === METODO_ENVIO_DOMICILIO && metodoPago === METODO_PAGO_EFECTIVO) return 'SINPE_MOVIL'
  return metodoPago
}

export function armarDireccionTienda(provincia: string, canton: string, senas: string): string {
  return [provincia.trim(), canton.trim(), senas.trim()].filter(Boolean).join(', ')
}

export function errorPasoDatosTienda(nombre: string, correo: string, telefono: string): string | null {
  if (!nombre.trim()) return 'Escribí tu nombre.'
  if (!correo.includes('@')) return 'Escribí un correo válido.'
  if (faltaTelefono(telefono)) return MSG_TELEFONO
  return null
}

export function errorPasoEntregaTienda(
  metodoEnvio: string,
  provincia: string,
  canton: string,
  senas: string,
): string | null {
  if (metodoEnvio !== METODO_ENVIO_DOMICILIO) return null
  if (!provincia || !canton || !senas.trim()) return MSG_DIRECCION_DOMICILIO
  return null
}

export const CTA_PASO_TIENDA = ['Continuar a entrega', 'Continuar al pago', 'Confirmar pedido'] as const

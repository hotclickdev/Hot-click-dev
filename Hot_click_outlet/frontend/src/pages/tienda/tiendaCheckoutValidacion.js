export const METODO_ENVIO_DOMICILIO = 'DOMICILIO'
export const METODO_ENVIO_RETIRO = 'RETIRO'

/** Mínimo de dígitos para contactar al comprador (CR: 8 locales). */
export const TELEFONO_MIN_DIGITOS = 8

export const MSG_DIRECCION_DOMICILIO = 'Indicá la dirección de entrega para el envío a domicilio.'
export const MSG_TELEFONO = 'Indicá un teléfono de contacto (mínimo 8 dígitos).'

/** True si el envío es a domicilio y no hay señas. */
export function faltaDireccionDomicilio(metodoEnvio, direccionEntrega) {
  if (metodoEnvio !== METODO_ENVIO_DOMICILIO) return false
  return !String(direccionEntrega ?? '').trim()
}

/** True si no hay suficientes dígitos para llamar o WhatsApp. */
export function faltaTelefono(telefono) {
  const digitos = String(telefono ?? '').replace(/\D/g, '')
  return digitos.length < TELEFONO_MIN_DIGITOS
}

/**
 * @param {{ metodoEnvio: string, direccionEntrega: string, telefonoCliente: string }} form
 * @returns {string | null}
 */
export function mensajeErrorCheckout(form) {
  if (faltaTelefono(form.telefonoCliente)) return MSG_TELEFONO
  if (faltaDireccionDomicilio(form.metodoEnvio, form.direccionEntrega)) return MSG_DIRECCION_DOMICILIO
  return null
}

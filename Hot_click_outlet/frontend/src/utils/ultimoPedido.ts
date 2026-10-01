/**
 * Resumen del último pedido iniciado en este navegador (solo sesión): permite que la pantalla de
 * confirmación del pago muestre el nombre, el correo y los paquetes aunque el retorno venga de la pasarela.
 * No guarda nada sensible: ni documento, ni tarjeta, ni teléfono.
 */
const CLAVE = 'hc-ultimo-pedido'
const VIGENCIA_MS = 6 * 60 * 60 * 1000

export type PaqueteUltimoPedido = {
  negocio: string
  productos: number
  /** Valor del método de envío elegido (`ENVIO_NORMAL_GAM`, `RETIRO_EN_TIENDA`, …). */
  metodoEnvio: string
}

export type UltimoPedido = {
  nombre: string
  correo: string
  paquetes: PaqueteUltimoPedido[]
  guardadoEn: number
}

export function guardarUltimoPedido(datos: Omit<UltimoPedido, 'guardadoEn'>): void {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify({ ...datos, guardadoEn: Date.now() }))
  } catch {
    /* sin almacenamiento disponible: la confirmación se muestra sin esos datos */
  }
}

export function leerUltimoPedido(): UltimoPedido | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    if (!crudo) return null
    const dato = JSON.parse(crudo) as UltimoPedido
    if (!dato || Date.now() - dato.guardadoEn > VIGENCIA_MS || !Array.isArray(dato.paquetes)) return null
    return dato
  } catch {
    return null
  }
}

export function limpiarUltimoPedido(): void {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    /* nada que limpiar */
  }
}

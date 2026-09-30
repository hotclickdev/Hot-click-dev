import { authService } from '@/services/authService'
import { analytics } from '@/utils/analytics'
import { attributionForCheckout } from '@/utils/attribution'
import { readMetaCookies } from '@/utils/metaPixel'
import type { CheckoutPayload } from '@/types/pedido'
import type { ItemCarrito } from '@/types/carrito'
import { BODEGA_DEFAULT } from './checkoutHelpers'
import { ENVIO, payloadPaquetes, requiereDireccion, type PaqueteCompra } from './paquetesCompra'
import { textoDireccion, type DatosCompra, type DireccionCompra, type MetodoPago } from './validacionCompra'

type PagarCompraDeps = {
  aceptaDatos: boolean
  /** Revalida datos, dirección y comprobante; devuelve `false` si algo falta. */
  validarTodo: () => boolean
  token: string | null
  metodoPago: MetodoPago
  datos: DatosCompra
  direccion: DireccionCompra
  paquetes: PaqueteCompra<ItemCarrito>[]
  envios: Record<string, string>
  items: ItemCarrito[]
  totalFinal: number
  cuponCodigo: string | null
  gcCodigo: string | null
  iniciarPago: (payload: CheckoutPayload, isGuest?: boolean, isSinpe?: boolean) => void
}

function notasCompra({ datos, direccion, envios }: PagarCompraDeps): string | null {
  const conDireccion = requiereDireccion(envios)
  const notas = [
    datos.nombre.trim() ? `Nombre: ${datos.nombre.trim()}` : '',
    datos.telefono ? `Teléfono: ${datos.telefono}` : '',
    conDireccion ? `Dirección: ${textoDireccion(direccion)}` : '',
  ].filter(Boolean).join(' | ')
  return notas || null
}

function itemsPayload(items: ItemCarrito[]) {
  return items.map((i) => ({
    productoId: i.id,
    cantidad: i.cantidad,
    ...(i.personalizacion
      ? {
          personalizacion: {
            imagenes: i.personalizacion.imagenes || [],
            notas: i.personalizacion.notas || null,
            tallaSeleccionada: i.personalizacion.tallaSeleccionada || null,
            encargoToken: i.personalizacion.encargoToken || null,
          },
        }
      : {}),
  }))
}

function atribucionPayload(atrib: ReturnType<typeof attributionForCheckout>, metaCookies: ReturnType<typeof readMetaCookies>) {
  if (atrib) return { atribucion: { first: atrib.first, last: atrib.last, ...metaCookies } }
  if (metaCookies.fbp || metaCookies.fbc) return { atribucion: { first: null, last: null, ...metaCookies } }
  return {}
}

/** Un solo paquete sin negocio usa la bodega de retiro o la bodega por defecto, como antes. */
function bodegaPrincipal(paquetes: PaqueteCompra[], envios: Record<string, string>): number {
  const [primero] = paquetes
  if (paquetes.length === 1 && envios[primero.clave] === ENVIO.RETIRO && primero.retiro) return primero.retiro.bodegaId
  return BODEGA_DEFAULT
}

/**
 * Inicia el pago — mismo orden de consentimiento, analytics e iniciarPago.
 * Devuelve `true` si llegó a llamar a `iniciarPago`.
 */
export function ejecutarPagarCheckout(deps: PagarCompraDeps): boolean {
  const { aceptaDatos, validarTodo, token, metodoPago, datos, paquetes, envios, items, totalFinal, iniciarPago } = deps
  if (!aceptaDatos) return false
  if (!validarTodo()) return false

  authService.registrarConsentimiento('CHECKOUT')

  const notas = notasCompra(deps)
  const isManual = metodoPago === 'SINPE' || metodoPago === 'EFECTIVO'
  analytics.pagoIntentado(totalFinal, items.reduce((s, i) => s + i.cantidad, 0))
  const atrib = attributionForCheckout()
  const metaCookies = readMetaCookies()
  iniciarPago(
    {
      bodegaId: bodegaPrincipal(paquetes, envios),
      metodoEnvio: envios[paquetes[0].clave],
      paquetes: payloadPaquetes(paquetes, envios),
      notas,
      provider: metodoPago,
      items: itemsPayload(items),
      codigoCupon: deps.cuponCodigo || null,
      codigoGiftCard: deps.gcCodigo || null,
      ...atribucionPayload(atrib, metaCookies),
      ...(token ? {} : { guestEmail: datos.correo.trim(), guestPhone: datos.telefono || null }),
    },
    !token,
    isManual,
  )
  return true
}

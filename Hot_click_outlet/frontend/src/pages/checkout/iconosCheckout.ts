import cantidadMas from '@/assets/figma/checkout/cantidad-mas.svg'
import cantidadMenos from '@/assets/figma/checkout/cantidad-menos.svg'
import avisoUbicacionRetiro from '@/assets/figma/checkout/aviso-ubicacion-retiro.svg'
import campoCorreo from '@/assets/figma/checkout/campo-correo.svg'
import campoTelefono from '@/assets/figma/checkout/campo-telefono.svg'
import campoUsuario from '@/assets/figma/checkout/campo-usuario.svg'
import candadoCompraSegura from '@/assets/figma/checkout/candado-compra-segura.svg'
import copiar from '@/assets/figma/checkout/copiar.svg'
import cupon from '@/assets/figma/checkout/cupon.svg'
import pagoEfectivo from '@/assets/figma/checkout/pago-efectivo.svg'
import pagoSinpe from '@/assets/figma/checkout/pago-sinpe.svg'
import pagoTarjeta from '@/assets/figma/checkout/pago-tarjeta.svg'
import subirComprobante from '@/assets/figma/checkout/subir-comprobante.svg'
import chevronDerecha from '@/assets/figma/checkout/chevron-derecha.svg'
import envioInternacional from '@/assets/figma/checkout/envio-internacional.svg'
import carritoVacio from '@/assets/figma/checkout/carrito-vacio.svg'
import eliminar from '@/assets/figma/checkout/eliminar.svg'
import envioPaquete from '@/assets/figma/checkout/envio-paquete.svg'
import guardarCorreo from '@/assets/figma/checkout/guardar-correo.svg'
import pagoProtegido from '@/assets/figma/checkout/pago-protegido.svg'
import paqueteOrigen from '@/assets/figma/checkout/paquete-origen.svg'
import paqueteTienda from '@/assets/figma/checkout/paquete-tienda.svg'
import paqueteUnEnvio from '@/assets/figma/checkout/paquete-un-envio.svg'
import paquetesCamion from '@/assets/figma/checkout/paquetes-camion.svg'
import resumenChevron from '@/assets/figma/checkout/resumen-chevron.svg'
import sumarDestello from '@/assets/figma/checkout/sumar-destello.svg'
import sumarMas from '@/assets/figma/checkout/sumar-mas.svg'
import whatsapp from '@/assets/figma/checkout/whatsapp.svg'

/** Íconos del Figma de carrito y checkout (`37:*`, `38:*`, `30:2381`, `45:1700`, `52:*`), exportados tal cual. */
export const ICONOS_CHECKOUT = {
  chevronDerecha,
  envioInternacional,
  avisoUbicacionRetiro,
  campoCorreo,
  campoTelefono,
  campoUsuario,
  candadoCompraSegura,
  copiar,
  cupon,
  pagoEfectivo,
  pagoSinpe,
  pagoTarjeta,
  subirComprobante,
  cantidadMas,
  cantidadMenos,
  carritoVacio,
  eliminar,
  envioPaquete,
  guardarCorreo,
  pagoProtegido,
  paqueteOrigen,
  paqueteTienda,
  paqueteUnEnvio,
  paquetesCamion,
  resumenChevron,
  sumarDestello,
  sumarMas,
  /** Multicolor (#25D366): se pinta con `<img>`, no con máscara. */
  whatsapp,
} as const

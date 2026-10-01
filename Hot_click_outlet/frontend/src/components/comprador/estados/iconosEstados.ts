import accesoAyuda from '@/assets/figma/sistema/acceso-ayuda.svg'
import accesoCategorias from '@/assets/figma/sistema/acceso-categorias.svg'
import accesoInicio from '@/assets/figma/sistema/acceso-inicio.svg'
import accesoPedidos from '@/assets/figma/sistema/acceso-pedidos.svg'
import alertaServidor from '@/assets/figma/sistema/alerta-servidor.svg'
import accesibilidad from '@/assets/figma/sistema/accesibilidad.svg'
import buscador404 from '@/assets/figma/sistema/buscador-404.svg'
import cookie from '@/assets/figma/sistema/cookie.svg'
import cookiesInterruptor from '@/assets/figma/sistema/cookies-interruptor.svg'
import cookiesSiempreActivas from '@/assets/figma/sistema/cookies-siempre-activas.svg'
import interruptorInactivo from '@/assets/figma/sistema/interruptor-inactivo.svg'
import offlineAviso from '@/assets/figma/sistema/offline-aviso.svg'
import offlineGrande from '@/assets/figma/sistema/offline-grande.svg'
import offlineReintentar from '@/assets/figma/sistema/offline-reintentar.svg'
import promoCorreo from '@/assets/figma/sistema/promo-correo.svg'
import promoRegalo from '@/assets/figma/sistema/promo-regalo.svg'
import salidaPedido from '@/assets/figma/sistema/salida-pedido.svg'
import whatsappFlotante from '@/assets/figma/sistema/whatsapp-flotante.svg'

/**
 * Íconos del Figma de sistema (404 `45:2198`, sin conexión `45:2264`, cookies `45:2152`/`45:2166`,
 * hojas `51:2168`/`51:2201`/`51:2234` y botón de WhatsApp `52:2418`), exportados tal cual.
 * Traen su color: se pintan con `<img>`, no con máscara.
 */
export const ICONOS_ESTADOS = {
  accesoAyuda,
  accesoCategorias,
  accesoInicio,
  accesoPedidos,
  accesibilidad,
  alertaServidor,
  buscador404,
  cookie,
  cookiesInterruptor,
  cookiesSiempreActivas,
  interruptorInactivo,
  offlineAviso,
  offlineGrande,
  offlineReintentar,
  promoCorreo,
  promoRegalo,
  salidaPedido,
  whatsappFlotante,
} as const

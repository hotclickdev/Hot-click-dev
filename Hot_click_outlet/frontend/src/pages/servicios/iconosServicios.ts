import blogBuscar from '@/assets/figma/servicios/blog-buscar.svg'
import blogCompartir from '@/assets/figma/servicios/blog-compartir.svg'
import blogFlecha from '@/assets/figma/servicios/blog-flecha.svg'
import cotizacionWhatsapp from '@/assets/figma/servicios/cotizacion-whatsapp.svg'
import encargoChat from '@/assets/figma/servicios/encargo-chat.svg'
import encargoCheck from '@/assets/figma/servicios/encargo-check.svg'
import encargoTarjeta from '@/assets/figma/servicios/encargo-tarjeta.svg'
import enviarChat from '@/assets/figma/servicios/enviar-chat.svg'
import enviarEscudo from '@/assets/figma/servicios/enviar-escudo.svg'
import fotoCamara from '@/assets/figma/servicios/foto-camara.svg'
import infoCamion from '@/assets/figma/servicios/info-camion.svg'
import infoChevronAbajo from '@/assets/figma/servicios/info-chevron-abajo.svg'
import inicioBuscar from '@/assets/figma/servicios/inicio-buscar.svg'
import inicioCaja from '@/assets/figma/servicios/inicio-caja.svg'
import inicioEscudo from '@/assets/figma/servicios/inicio-escudo.svg'
import inicioEstrella from '@/assets/figma/servicios/inicio-estrella.svg'
import inicioFlecha from '@/assets/figma/servicios/inicio-flecha.svg'
import inicioFlechaAzul from '@/assets/figma/servicios/inicio-flecha-azul.svg'
import inicioReloj from '@/assets/figma/servicios/inicio-reloj.svg'
import radioActivo from '@/assets/figma/servicios/radio-activo.svg'
import radioInactivo from '@/assets/figma/servicios/radio-inactivo.svg'
import selectorAbajo from '@/assets/figma/servicios/selector-abajo.svg'

/**
 * Íconos exportados del Figma para SRV (Servicios HOT, encargo, cotización, informativas y blog).
 * Cada archivo trae su color de origen; el nombre indica la pantalla donde se usa.
 */
export const ICONOS_SRV = {
  blogBuscar,
  blogCompartir,
  blogFlecha,
  cotizacionWhatsapp,
  encargoChat,
  encargoCheck,
  encargoTarjeta,
  enviarChat,
  enviarEscudo,
  fotoCamara,
  infoCamion,
  infoChevronAbajo,
  inicioBuscar,
  inicioCaja,
  inicioEscudo,
  inicioEstrella,
  inicioFlecha,
  inicioFlechaAzul,
  inicioReloj,
  radioActivo,
  radioInactivo,
  selectorAbajo,
} as const

export type NombreIconoSrv = keyof typeof ICONOS_SRV

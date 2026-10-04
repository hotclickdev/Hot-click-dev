import { TEXTO_TIEMPO_ENVIO } from '@/config/tiemposEnvio'

export type FilaTarifa = {
  id: string
  nombre: string
  /** Tiempo de entrega; se muestra bajo el nombre (Figma `28:1700`). */
  tiempo: string
  /** Aclaración corta que se suma al tiempo ("pago previo", "estimado"). */
  nota?: string
  /** Texto largo que reemplaza al tiempo (Figma `28:1727`: la encomienda explica su cobro). */
  detalle?: string
  precio: string
  /** Enlace de la fila completa (atajo del envío internacional por WhatsApp). */
  href?: { url: string; ariaLabel: string }
}

/** Tarifas de la página de envíos. Los tiempos salen de `config/tiemposEnvio.ts` (D13, confirmados el 2-oct-2026); los montos, del contenido existente. No alterar sin avisar al negocio. */
export const TARIFAS: FilaTarifa[] = [
  {
    id: 'rapido',
    nombre: 'Envío rápido GAM',
    tiempo: TEXTO_TIEMPO_ENVIO.rapido,
    nota: 'pago previo',
    precio: '₡5.000',
  },
  {
    id: 'normal-gam',
    nombre: 'Envío normal GAM',
    tiempo: TEXTO_TIEMPO_ENVIO.normalGam,
    nota: 'estimado',
    precio: '~₡4.000',
  },
  {
    id: 'fuera-gam',
    nombre: 'Fuera de la GAM',
    tiempo: TEXTO_TIEMPO_ENVIO.fueraGam,
    nota: 'estimado',
    precio: '~₡4.000',
  },
  {
    id: 'encomienda',
    nombre: 'Encomienda',
    tiempo: 'Según tu mensajero',
    detalle: 'Según la empresa de buses o transporte y el destino. Te confirmamos el monto por WhatsApp antes de despachar y lo pagás al retirar en la terminal.',
    precio: 'Varía',
  },
  {
    id: 'internacional',
    nombre: 'Internacional',
    tiempo: 'A coordinar',
    precio: 'Consultar',
    href: {
      url: 'https://wa.me/50686667888?text=Hola%20HotClick%2C%20consulto%20un%20env%C3%ADo%20internacional.',
      ariaLabel: 'Consultar envío internacional por WhatsApp',
    },
  },
]

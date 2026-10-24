import { PLAN_PRECIOS, textoComision, textoMensualidad } from '@/config/planesPrecios'

const PYME = PLAN_PRECIOS.PYME
const PLUS = PLAN_PRECIOS.NEGOCIO_PLUS
const EMP = PLAN_PRECIOS.EMPRENDEDOR

export type LandingPlanId = 'emprendedor' | 'pyme' | 'plus'
export type Tono = 'artesanal' | 'estandar' | 'ejecutivo'

export type PlanLandingCopy = {
  planId: LandingPlanId
  tono: Tono
  query: 'emprendedor' | 'pyme' | 'negocio-plus'
  eyebrow: string
  headline: string
  subheadline: string
  precio: string
  ctaLabel: string
  paraQuienSi: string[]
  paraQuienNo: string[]
  faq: { pregunta: string; respuesta: string }[]
}

export const PLAN_LANDING_COPY: Record<LandingPlanId, PlanLandingCopy> = {
  emprendedor: {
    planId: 'emprendedor',
    tono: 'artesanal',
    query: 'emprendedor',
    eyebrow: 'Para empezar',
    headline: 'Publicá y cobrá en HotClick',
    // Gratis o US$/mes depende del cupo: PlanLandingLayout lo arma con datos del backend.
    subheadline: 'Gratis para los primeros 70 negocios; después, mensualidad en dólares.',
    precio: `${textoMensualidad()} · ${textoComision(EMP.comisionPct)}`,
    ctaLabel: 'Crear mi negocio',
    paraQuienSi: [
      'Vendés en feria, Instagram o WhatsApp',
      'Todavía no tenés equipo ni local fijo',
      'Querés publicar tu primer producto hoy mismo',
    ],
    paraQuienNo: [
      'Ya tenés equipo y varias bodegas — mirá PYME',
    ],
    faq: [
      { pregunta: '¿Me cobran la tarjeta al registrarme?', respuesta: `Mientras haya cupo gratis, no. Pagás ${textoComision(EMP.comisionPct)}, sin mínimo. Si el cupo ya se llenó, la mensualidad es en dólares y la ves acá antes de pagar.` },
      { pregunta: '¿Hay cupo limitado?', respuesta: 'Sí, los primeros 70 negocios entran gratis. Después, Emprendedor tiene mensualidad en dólares.' },
    ],
  },
  pyme: {
    planId: 'pyme',
    tono: 'estandar',
    query: 'pyme',
    eyebrow: 'Para crecer',
    headline: 'Operá el negocio en un solo panel',
    subheadline: 'Equipo, inventario y caja, con mensualidad en dólares.',
    precio: `${textoMensualidad()} + ${textoComision(PYME.comisionPct)}`,
    ctaLabel: 'Suscribirme a PYME',
    paraQuienSi: [
      'Ya vendés seguido, con 2 a 5 personas en el equipo',
      'Tenés stock en una o dos bodegas',
      'Se te quedó corto el cuaderno o el Excel',
    ],
    paraQuienNo: [
      'Recién arrancás y vendés poco — probá Emprendedor',
    ],
    faq: [
      { pregunta: '¿Por qué pagar si el otro plan es gratis?', respuesta: `El gratis se queda en 50 productos y sin compras. PYME suma equipo, compras, gift cards e IA. Comisión: ${textoComision(PYME.comisionPct)}, sin mínimo.` },
      { pregunta: '¿Cuándo se activa mi suscripción?', respuesta: 'Al confirmar el pago con la pasarela, tu plan PYME queda activo de inmediato.' },
    ],
  },
  plus: {
    planId: 'plus',
    tono: 'ejecutivo',
    query: 'negocio-plus',
    eyebrow: 'Para operar en serio',
    headline: 'Todas las sucursales en un panel',
    subheadline: 'Pedidos por local, equipo sin tope y CRM.',
    precio: `${textoMensualidad()} + ${textoComision(PLUS.comisionPct)}`,
    ctaLabel: 'Suscribirme a Negocio Plus',
    paraQuienSi: [
      'Tenés más de un local',
      'Tu equipo ya no cabe en 5 usuarios',
      'Necesitás ver pedidos por sucursal y CRM de clientes',
    ],
    paraQuienNo: [
      'Tenés un solo local y menos de 5 personas — con PYME te alcanza',
    ],
    faq: [
      { pregunta: '¿En qué se diferencia de PYME?', respuesta: 'Varias sucursales, CRM de clientes, y sin tope de productos, usuarios ni créditos de IA.' },
      { pregunta: '¿Cuándo se activa mi suscripción?', respuesta: 'Al confirmar el pago con la pasarela, tu plan Negocio Plus queda activo de inmediato.' },
    ],
  },
}

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
    subheadline: 'Sin mensualidad: solo una comisión cuando vendés.',
    precio: '₡0/mes · comisión 8% por venta (mín. ₡400)',
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
      { pregunta: '¿Me cobran la tarjeta al registrarme?', respuesta: 'No. La membresía es ₡0. HotClick se queda un 8% de cada venta (mínimo ₡400), que cubre pasarela y plataforma.' },
      { pregunta: '¿Hay cupo limitado?', respuesta: 'Sí, los primeros 70 registros del mes entran gratis. Si se llena, podés seguir con PYME.' },
    ],
  },
  pyme: {
    planId: 'pyme',
    tono: 'estandar',
    query: 'pyme',
    eyebrow: 'Para crecer',
    headline: 'Operá el negocio en un solo panel',
    subheadline: 'Equipo, inventario y caja, por ₡9.900 al mes.',
    precio: '₡9.900/mes + 4% por venta',
    ctaLabel: 'Suscribirme a PYME — ₡9.900/mes',
    paraQuienSi: [
      'Ya vendés seguido, con 2 a 5 personas en el equipo',
      'Tenés stock en una o dos bodegas',
      'Se te quedó corto el cuaderno o el Excel',
    ],
    paraQuienNo: [
      'Recién arrancás y vendés poco — probá Emprendedor sin mensualidad',
    ],
    faq: [
      { pregunta: '¿Por qué pagar si el otro plan es gratis?', respuesta: 'El gratis cobra 8% y se queda en 50 productos, sin compras. PYME baja la comisión a 4% y suma equipo, compras, gift cards e IA.' },
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
    precio: '₡24.900/mes + 4% por venta',
    ctaLabel: 'Suscribirme a Negocio Plus — ₡24.900/mes',
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

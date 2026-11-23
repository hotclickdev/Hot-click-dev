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

/**
 * «los primeros N negocios». N es el `limite` que publica el backend (hotclick.trial-emprendedor.cupo); aquí no hay
 * ninguna cifra. Sin dato (cargando, error o límite inválido) queda «los primeros negocios», sin inventar un número.
 */
export function textoPrimerosNegocios(limite?: number | null): string {
  return typeof limite === 'number' && Number.isInteger(limite) && limite > 0
    ? `los primeros ${limite} negocios`
    : 'los primeros negocios'
}

/** Datos del backend que completan el copy de Emprendedor; todos opcionales (sin dato, el texto no inventa cifras). */
export type DatosCupoCopy = {
  /** «3 meses», de `periodoGratis` en /public/emprende/cupos. */
  periodo?: string | null
  /** Mensualidad USD de lista, de `mensualidadUsdSinCupo`. */
  mensualUsd?: number | null
}

/** «sin mensualidad por 3 meses» o, sin dato, «sin mensualidad por un período». */
function textoSinMensualidad(periodo?: string | null): string {
  const p = periodo?.trim()
  return p ? `sin mensualidad por ${p}` : 'sin mensualidad por un período'
}

function copyEmprendedor(limite?: number | null, datos: DatosCupoCopy = {}): PlanLandingCopy {
  const primeros = textoPrimerosNegocios(limite)
  const sinMensualidad = textoSinMensualidad(datos.periodo)
  const porPeriodo = sinMensualidad.replace('sin mensualidad ', '')
  // «US$9/mes» si el backend mandó monto; si no, «mensualidad en dólares» (nunca se inventa un monto).
  const despues = textoMensualidad(datos.mensualUsd).replace(/^M/, 'm')
  const comision = textoComision(EMP.comisionPct)
  return {
    planId: 'emprendedor',
    tono: 'artesanal',
    query: 'emprendedor',
    eyebrow: 'Para empezar',
    headline: 'Publicá y cobrá en HotClick',
    // Sin mensualidad o US$/mes depende del cupo: PlanLandingLayout arma la línea de precio con datos del backend.
    subheadline: `${sinMensualidad[0].toUpperCase()}${sinMensualidad.slice(1)} para ${primeros}; después, ${despues} + ${comision}, sin mínimo.`,
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
      { pregunta: '¿Me cobran la tarjeta al registrarme?', respuesta: `Mientras haya cupo, no: no pagás mensualidad ${porPeriodo} y solo pagás ${comision}, sin mínimo. Después, o si el cupo ya se llenó, pagás ${despues} + ${comision}. La mensualidad la ves antes de pagar.` },
      { pregunta: '¿Hay cupo limitado?', respuesta: `Sí, ${primeros} no pagan mensualidad ${porPeriodo}. Terminado ese período, Emprendedor paga ${despues} + ${comision}. Los productos se venden en colones; la mensualidad se cobra en dólares.` },
    ],
  }
}

export const PLAN_LANDING_COPY: Record<LandingPlanId, PlanLandingCopy> = {
  emprendedor: copyEmprendedor(),
  pyme: {
    planId: 'pyme',
    tono: 'estandar',
    query: 'pyme',
    eyebrow: 'Para crecer',
    headline: 'Operá el negocio en un solo panel',
    subheadline: 'Equipo, inventario y caja. Mensualidad en dólares más comisión por venta, sin mínimo.',
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
      { pregunta: '¿Por qué pagar PYME si Emprendedor casi no cuesta al empezar?', respuesta: `El período sin mensualidad de Emprendedor es temporal y con cupo limitado; después también tiene mensualidad. Emprendedor se queda en menos productos y sin compras, y PYME suma equipo, compras, gift cards e IA. Comisión de PYME: ${textoComision(PYME.comisionPct)}, sin mínimo.` },
      { pregunta: '¿Cuándo se activa mi suscripción?', respuesta: 'Al confirmar el pago con la pasarela, tu plan PYME queda activo de inmediato.' },
    ],
  },
  plus: {
    planId: 'plus',
    tono: 'ejecutivo',
    query: 'negocio-plus',
    eyebrow: 'Para operar en serio',
    headline: 'Todas las sucursales en un panel',
    subheadline: 'Pedidos por local, equipo sin tope y CRM. Mensualidad en dólares más comisión por venta, sin mínimo.',
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

/**
 * Copy de una landing con el cupo real del backend. Solo Emprendedor menciona el cupo; las demás salen tal cual.
 * Sin `limite` devuelve el texto de respaldo (sin número).
 */
export function copyLanding(planId: LandingPlanId, limite?: number | null, datos?: DatosCupoCopy): PlanLandingCopy {
  return planId === 'emprendedor' ? copyEmprendedor(limite, datos) : PLAN_LANDING_COPY[planId]
}

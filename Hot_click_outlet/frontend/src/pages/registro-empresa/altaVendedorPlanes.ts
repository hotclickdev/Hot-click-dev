import type { PlanQueryId } from './planQueryParam'

/**
 * Montos del alta de vendedor. Los fija solo HOT_CLICK (decisión 3-oct-2026): mientras no estén
 * confirmados se muestran como [PENDIENTE] y ningún texto inventa mensualidad, comisión ni mínimo.
 */
export const MONTO_PENDIENTE = '[PENDIENTE]'

export type BeneficioPlan = { id: string; texto: string; icono: 'contacto' | 'productos' | 'bodegas' | 'escudo' | 'pos' | 'equipo' | 'ia' }

export type PlanAlta = {
  id: PlanQueryId
  nombre: string
  tagline: string
  beneficios: BeneficioPlan[]
  /** Pyme y Negocio Plus muestran el contacto en su tienda; Emprendedor nunca (`contactoDirecto` del backend). */
  contactoVisible: boolean
}

/**
 * Copy final de Producto (`textos-planes-final.md`, 3-oct-2026, claves `planes.*`). Límites = los que hoy aplica el backend
 * (DataSeeder: productos 50/500/sin límite, bodegas y cajas 1/2/sin límite, usuarios 2/5/sin límite, IA 0/80/sin límite), provisionales hasta que HOT_CLICK los confirme.
 */
export const PLANES_ALTA: PlanAlta[] = [
  {
    id: 'emprendedor',
    nombre: 'Emprendedor',
    tagline: 'Empezá a vender en HotClick.',
    contactoVisible: false,
    beneficios: [
      { id: 'productos', texto: 'Hasta 50 productos', icono: 'productos' },
      { id: 'bodegas', texto: '1 bodega', icono: 'bodegas' },
      { id: 'pos', texto: 'Punto de venta con 1 caja', icono: 'pos' },
      { id: 'equipo', texto: 'Equipo de 2 usuarios', icono: 'equipo' },
      { id: 'contacto', texto: 'Tus clientes te compran a través de HotClick', icono: 'escudo' },
    ],
  },
  {
    id: 'pyme',
    nombre: 'Pyme',
    tagline: 'Para cuando tu negocio ya tiene clientes que te buscan.',
    contactoVisible: true,
    beneficios: [
      { id: 'contacto', texto: 'Tu contacto visible en tu tienda', icono: 'contacto' },
      { id: 'productos', texto: 'Hasta 500 productos', icono: 'productos' },
      { id: 'bodegas', texto: '2 bodegas', icono: 'bodegas' },
      { id: 'pos', texto: 'Punto de venta con 2 cajas', icono: 'pos' },
      { id: 'equipo', texto: 'Equipo de 5 usuarios', icono: 'equipo' },
      { id: 'compras', texto: 'Compras a proveedores y gift cards', icono: 'productos' },
      { id: 'ia', texto: '80 consultas de IA al mes', icono: 'ia' },
    ],
  },
  {
    id: 'negocio-plus',
    nombre: 'Negocio Plus',
    tagline: 'Sin límites para crecer.',
    contactoVisible: true,
    beneficios: [
      { id: 'contacto', texto: 'Tu contacto visible en tu tienda', icono: 'contacto' },
      { id: 'productos', texto: 'Productos sin límite', icono: 'productos' },
      { id: 'bodegas', texto: 'Bodegas sin límite', icono: 'bodegas' },
      { id: 'pos', texto: 'Punto de venta con cajas sin límite', icono: 'pos' },
      { id: 'equipo', texto: 'Usuarios sin límite', icono: 'equipo' },
      { id: 'ia', texto: 'Consultas de IA sin límite', icono: 'ia' },
      { id: 'base', texto: 'Todo lo de Pyme', icono: 'escudo' },
    ],
  },
]

export const PASOS_ALTA = ['Plan', 'Tu negocio', 'Activar'] as const

/** Textos comunes (`planes.nota.cambio`, `planes.nota.montos`, `planes.subtitulo`, `registro.revision.texto`, `planes.pagarDespues.ayuda`). */
export const TEXTO_CAMBIO_PLAN = 'Podés subir de plan cuando quieras.'
export const TEXTO_MONTOS = 'Los montos se confirman antes de pagar.'
export const TEXTO_SUBTITULO_PLANES = 'Todos los planes incluyen tienda en HotClick, punto de venta, inventario y lista de clientes.'
export const TEXTO_REVISION = 'Revisamos tu tienda antes de publicarla. Te avisamos por correo.'
export const textoPagarDespues = (plan: string) => `Tu tienda arranca como Emprendedor y tu contacto no se muestra hasta que pagués ${plan}.`

export function planAlta(id: PlanQueryId | null): PlanAlta {
  return PLANES_ALTA.find((p) => p.id === id) ?? PLANES_ALTA[0]
}

/** Destino tras crear la cuenta: Pyme y Plus van a activar el plan (paso 3); Emprendedor ve "¡Listo!". */
export function destinoTrasAlta(id: PlanQueryId): string | null {
  return id === 'emprendedor' ? null : `/registro-empresa/activar-plan?plan=${id}`
}

export const TOUR_KEY = 'hc-admin-tour-v4-done'

export type TourDemo =
  | { type: 'kpis'; items: { label: string; value: string }[] }
  | { type: 'products'; items: { nombre: string; precio: string; stock: number }[] }
  | { type: 'orders'; items: { numero: string; estado: string; total: string }[] }
  | { type: 'pos'; items: { nombre: string; cant: number; precio: string }[]; total: string; metodo: string }
  | { type: 'finance'; items: { label: string; value: string }[] }
  | { type: 'offer'; badge: string; cupon: string }
  | { type: 'ai'; pregunta: string; respuesta: string }
  | { type: 'team'; items: { nombre: string; rol: string }[] }

export type TourStep = {
  type?: 'welcome' | 'done'
  path?: string
  icono: string
  title: string
  subtitle?: string
  desc: string
  features?: string[]
  tip?: string
  color: string
  demo?: TourDemo
}

const COLOR = 'var(--hc-primary)'

/** Tour corto Super Admin: sin Finanzas ni Copilot (no son su modelo mental). */
export const STEPS_SUPER_ADMIN: TourStep[] = [
  {
    type: 'welcome',
    icono: 'bolsa',
    title: 'Panel Super Admin',
    desc: 'Recorrido corto de la plataforma: tiendas, usuarios, moderación y configuración.',
    color: COLOR,
  },
  {
    path: '/admin',
    icono: 'casa',
    title: 'Panel Admin',
    subtitle: 'Vista general',
    desc: 'KPIs de la plataforma, carga masiva y tiendas recientes.',
    tip: 'Empezá por Carga masiva o Moderación según lo que tengas pendiente.',
    color: COLOR,
    demo: { type: 'kpis', items: [
      { label: 'Tiendas activas', value: '24' },
      { label: 'Pendientes', value: '3' },
    ] },
  },
  {
    path: '/admin/aprobaciones',
    icono: 'lista',
    title: 'Moderación',
    subtitle: 'Cola de revisión',
    desc: 'Aprobá negocios y promociones. Pausado de productos se gestiona en Empresas.',
    color: COLOR,
  },
  {
    path: '/admin/empresas',
    icono: 'edificio',
    title: 'Tiendas',
    subtitle: 'Negocios en la plataforma',
    desc: 'Buscá, filtrá y abrí el detalle de cada tienda.',
    color: COLOR,
  },
  {
    path: '/admin/configuracion',
    icono: 'edificio',
    title: 'Configuración',
    subtitle: 'Ajustes de plataforma',
    desc: 'Comisión, categorías, política y métodos de pago.',
    color: COLOR,
  },
  {
    type: 'done',
    icono: 'check',
    title: 'Listo',
    desc: 'Podés volver a ver la guía por pantalla desde el botón de ayuda.',
    color: COLOR,
  },
]

/** Tour del dueño / equipo de tienda (sin saltos a Finanzas/Copilot en el flujo principal). */
export const STEPS: TourStep[] = [
  {
    type: 'welcome',
    icono: 'bolsa',
    title: 'Bienvenido al Panel HotClick',
    desc: 'Este tour te lleva por las secciones principales para gestionar tu negocio.',
    color: COLOR,
  },
  {
    path: '/admin',
    icono: 'casa',
    title: 'Dashboard',
    subtitle: 'Tu centro de control diario',
    desc: 'La primera pantalla que verás al entrar. Muestra el estado de tu negocio en tiempo real.',
    features: [
      'KPIs de ventas: ingresos hoy, esta semana y este mes',
      'Pedidos recientes con su estado actual',
      'Gráfica de ventas de los últimos 7 días',
    ],
    tip: 'Empezá aquí cada día para ver el panorama completo.',
    color: COLOR,
    demo: { type: 'kpis', items: [
      { label: 'Ventas hoy', value: '₡145,000' },
      { label: 'Pedidos', value: '12' },
      { label: 'Clientes nuevos', value: '3' },
    ] },
  },
  {
    path: '/admin/productos',
    icono: 'paquete',
    title: 'Catálogo de Productos',
    subtitle: 'Tu inventario digital',
    desc: 'Creá y gestioná lo que vendés: fotos, precios, stock y categorías.',
    tip: 'Usá Nuevo producto o Carga masiva según el volumen.',
    color: COLOR,
    demo: { type: 'products', items: [
      { nombre: 'Camisa azul talla M', precio: '₡12,000', stock: 8 },
      { nombre: 'Audífonos inalámbricos', precio: '₡25,000', stock: 3 },
    ] },
  },
  {
    path: '/admin/pedidos',
    icono: 'lista',
    title: 'Pedidos',
    subtitle: 'Órdenes online',
    desc: 'Gestioná estados, guías y avisos al cliente.',
    color: '#34d399',
    demo: { type: 'orders', items: [
      { numero: '#ORD-1042', estado: 'Pendiente', total: '₡18,500' },
      { numero: '#ORD-1041', estado: 'Entregado', total: '₡32,000' },
    ] },
  },
  {
    path: '/admin/pos',
    icono: 'monitor',
    title: 'Caja POS',
    subtitle: 'Ventas presenciales',
    desc: 'Cobrá cara a cara: buscá, agregá a la factura y cobrá.',
    tip: 'F2 buscar · F8 cobrar.',
    color: '#f59e0b',
    demo: { type: 'pos', items: [
      { nombre: 'Camisa azul talla M', cant: 1, precio: '₡12,000' },
      { nombre: 'Gorra negra', cant: 1, precio: '₡6,500' },
    ], total: '₡18,500', metodo: 'SINPE Móvil' },
  },
  {
    type: 'done',
    icono: 'check',
    title: 'Tour completado',
    desc: 'Ya conocés las secciones principales. La guía por pantalla también está en el botón de ayuda.',
    color: COLOR,
  },
]

export function pasosTourParaRol(rol: string | null | undefined): TourStep[] {
  if (rol === 'ADMIN') return STEPS_SUPER_ADMIN
  return STEPS
}

export const TOTAL = STEPS.length

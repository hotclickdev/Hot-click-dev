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

export const STEPS: TourStep[] = [
  {
    type: 'welcome',
    icono: 'bolsa',
    title: '¡Bienvenido al Panel HotClick!',
    desc: 'Este tour te lleva por cada sección del panel para que aprendas a gestionar tu negocio paso a paso. Solo toma un par de minutos.',
    color: 'var(--hc-accent)',
  },
  {
    path: '/admin',
    icono: 'casa',
    title: 'Dashboard',
    subtitle: 'Tu centro de control diario',
    desc: 'La primera pantalla que verás al entrar. Muestra el estado de tu negocio en tiempo real para tomar decisiones rápidas.',
    features: [
      'KPIs de ventas: ingresos hoy, esta semana y este mes',
      'Pedidos recientes con su estado actual',
      'Gráfica de ventas de los últimos 7 días',
      'Últimos clientes registrados en la plataforma',
    ],
    tip: 'Empezá aquí cada día para ver el panorama completo antes de atender clientes.',
    color: 'var(--hc-accent)',
    demo: { type: 'kpis', items: [
      { label: 'Ventas hoy',    value: '₡145,000' },
      { label: 'Pedidos',       value: '12' },
      { label: 'Clientes nuevos', value: '3' },
    ] },
  },
  {
    path: '/admin/productos',
    icono: 'paquete',
    title: 'Catálogo de Productos',
    subtitle: 'Tu inventario digital completo',
    desc: 'Desde acá creás y gestionás todo lo que vendés: fotos, precios, stock, categorías y más.',
    features: [
      'Crear productos con fotos, precio y descripción detallada',
      'Generar fichas de producto automáticamente con IA desde una foto',
      'Clasificar por categorías, marcas y etiquetas',
      'Control de stock con alertas de inventario bajo',
      'Destacar productos para que aparezcan en el homepage',
    ],
    tip: 'Usá "Crear con IA" — sacás una foto y la IA rellena título, descripción y precio sugerido.',
    color: 'var(--hc-accent)',
    demo: { type: 'products', items: [
      { nombre: 'Camisa azul talla M',       precio: '₡12,000', stock: 8 },
      { nombre: 'Audífonos inalámbricos',    precio: '₡25,000', stock: 3 },
    ] },
  },
  {
    path: '/admin/pedidos',
    icono: 'lista',
    title: 'Pedidos',
    subtitle: 'Gestión de órdenes online',
    desc: 'Acá aterrizan todas las compras que hacen tus clientes desde la tienda online. Podés gestionar cada pedido de principio a fin.',
    features: [
      'Avanzar estados: Pendiente, Pagado, Enviado, Entregado',
      'Asignar número de guía de Correos de Costa Rica',
      'Notificar al cliente por email con un solo click',
      'Generar mensaje de WhatsApp listo para enviar',
    ],
    tip: 'El botón WhatsApp genera un mensaje completo con productos, estado y guía — solo abrís el chat.',
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
    subtitle: 'Ventas presenciales y ferias',
    desc: 'Punto de venta para cobrar cara a cara en tu tienda, feria o evento. No necesitás internet para funcionar.',
    features: [
      'Buscador ultra rápido para agregar productos al carrito',
      'Aceptar efectivo, SINPE Móvil y tarjeta débito/crédito',
      'Enviar recibo por WhatsApp o imprimir en térmica',
      'Cuadre de caja al final de cada turno',
      'Modo mesas: ideal para restaurantes y cafeterías',
    ],
    tip: 'Activá el modo offline antes de ir a una feria — podés cobrar sin señal y sincroniza al volver.',
    color: '#f59e0b',
    demo: { type: 'pos', items: [
      { nombre: 'Camisa azul talla M', cant: 1, precio: '₡12,000' },
      { nombre: 'Gorra negra',         cant: 1, precio: '₡6,500' },
    ], total: '₡18,500', metodo: 'SINPE Móvil' },
  },
  {
    path: '/admin/finanzas',
    icono: 'tarjeta',
    title: 'Finanzas',
    subtitle: 'Ingresos reales de tu negocio',
    desc: 'Resumen financiero claro: cuánto entraste, cuánto costaron los envíos y el desglose por cada pedido entregado.',
    features: [
      'Ingresos totales por productos (solo pedidos ENTREGADOS)',
      'Costos de envío desglosados: moto vs Correos CR',
      'Filtros por período: hoy, 7 días, 30 días o rango manual',
      'Tabla con desglose detallado y totales por pedido',
    ],
    tip: 'Solo se muestran pedidos ENTREGADOS — siempre ves dinero real, no promesas de pago.',
    color: '#4ade80',
    demo: { type: 'finance', items: [
      { label: 'Ingresos productos', value: '₡845,000' },
      { label: 'Costos de envío',    value: '₡42,000' },
      { label: 'Total cobrado',      value: '₡887,000' },
    ] },
  },
  {
    path: '/admin/ofertas',
    icono: 'megafono',
    title: 'Marketing',
    subtitle: 'Atraé y retené clientes',
    desc: 'Herramientas para promocionar tu negocio: ofertas automáticas, cupones, publicaciones en redes y blog.',
    features: [
      'Crear ofertas con descuento por porcentaje o monto fijo',
      'Generar códigos de cupón para clientes especiales',
      'Publicar posts directamente en tu página de Facebook',
      'Blog: artículos y noticias para posicionar tu marca',
      'Aparecer en el directorio de emprendimientos',
    ],
    tip: 'Los cupones se aplican automáticamente en el checkout — sin pasos extra para el cliente.',
    color: '#E5A93D',
    demo: { type: 'offer', badge: '-20% Camisas de verano', cupon: 'VERANO20' },
  },
  {
    path: '/admin/copilot',
    icono: 'sparkle',
    title: 'Consultas con Hot',
    subtitle: 'Preguntale por tu negocio',
    desc: 'Hot usa los datos reales de tu tienda: ventas, stock y productos. Las respuestas pueden tener errores: verificá lo importante.',
    features: [
      'Inventario, ventas del día y qué reponer',
      'Productos que no se mueven, con acción sugerida',
      'Te quedan N consultas al mes según tu plan',
    ],
    tip: 'Probá: "¿Cómo está el inventario y el stock crítico?"',
    color: 'var(--hc-blue-300)',
    demo: { type: 'ai',
      pregunta: '¿Cuál es mi producto más rentable?',
      respuesta: 'Camisa azul: 34% de margen, 18 unidades vendidas este mes.' },
  },
  {
    path: '/admin/configuracion?seccion=marca',
    icono: 'edificio',
    title: 'Marca de tu tienda',
    subtitle: 'Cómo te ven los compradores',
    desc: 'Nombre comercial, logo, WhatsApp y visibilidad pública. Eso es lo que aparece en /tienda.',
    features: [
      'Nombre, logo, frase y WhatsApp de la tienda',
      'Colores de tu marca en la tienda pública',
      'Publicar u ocultar la tienda cuando esté lista',
    ],
    tip: 'Sin marca clara, el comprador no sabe de quién es el pedido.',
    color: '#6490EA',
    demo: { type: 'team', items: [
      { nombre: 'María',  rol: 'Cajera' },
      { nombre: 'Carlos', rol: 'Gerente' },
    ] },
  },
  {
    type: 'done',
    icono: 'check',
    title: '¡Tour completado!',
    desc: 'Ya conocés las secciones principales del panel. Podés volver a ver este tour cuando quieras desde el botón de ayuda en el menú.',
    color: 'var(--hc-accent)',
  },
]

export const TOTAL = STEPS.length

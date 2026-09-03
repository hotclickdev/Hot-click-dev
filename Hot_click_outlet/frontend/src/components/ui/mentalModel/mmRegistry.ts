import { TOUR_KEY } from '@/components/ui/appTour/appTourSteps'

/** Clave global para apagar el coach (Opciones + Playwright). */
export const MM_OFF_KEY = 'hc-mm-v1-off'

/** Prefijo de claves por pantalla: `hc-mm-v1:/admin/...` */
export const MM_PREFIX = 'hc-mm-v1:'

/** Bienvenida del panel admin (una sola vez). */
export const MM_WELCOME_KEY = 'hc-mm-v1-welcome-done'

/** Bienvenida del panel vendedor (emprendedor / pyme / plus). */
export const MM_WELCOME_SELLER_KEY = 'hc-mm-v1-welcome-seller-done'

/** Bienvenida del marketplace Visitante. */
export const MM_WELCOME_VISITANTE_KEY = 'hc-mm-v1-welcome-visitante-done'

export type MmPaso = {
  /** Valor de `data-mm` en el ancla real. Vacío = tooltip centrado. */
  ancla: string
  titulo: string
  texto: string
}

export type MmGuia = {
  /** Prefijo de ruta que debe coincidir (pathname). */
  path: string
  /** Roles que ven esta guía. Vacío = todos los roles admin. */
  roles?: readonly string[]
  pasos: readonly MmPaso[]
}

const ROLES_VENDEDOR = ['EMPRENDEDOR', 'GERENTE', 'SUPERVISOR'] as const
const BASES_VENDEDOR = ['/emprendedor', '/pyme', '/negocio-plus'] as const

function guiasVendedor(segmento: string, pasos: readonly MmPaso[]): MmGuia[] {
  return BASES_VENDEDOR.map((base) => ({
    path: segmento ? `${base}/${segmento}` : base,
    roles: [...ROLES_VENDEDOR],
    pasos,
  }))
}

/** Guías Visitante: sin roles → también anónimos. */
function guiasVisitante(segmento: string, pasos: readonly MmPaso[]): MmGuia[] {
  return [{
    path: segmento ? `/visitante/${segmento}` : '/visitante',
    roles: [],
    pasos,
  }]
}

/**
 * Máximo 3 focos por pantalla. Copy corto: qué podés hacer + dónde clic.
 */
export const MM_GUIAS: readonly MmGuia[] = [
  {
    path: '/admin',
    roles: ['ADMIN'],
    pasos: [
      {
        ancla: 'carga-masiva',
        titulo: 'Carga masiva',
        texto: 'Desde acá subís muchos productos de una vez a una tienda.',
      },
      {
        ancla: 'mas-herramientas',
        titulo: 'Más herramientas',
        texto: 'Marcas, garantías, clientes y el resto de utilidades de plataforma.',
      },
      {
        ancla: 'tiendas-recientes',
        titulo: 'Tiendas recientes',
        texto: 'Entrá a la lista de tiendas para aprobar, filtrar o suspender.',
      },
    ],
  },
  {
    path: '/admin',
    roles: ['EMPRENDEDOR', 'GERENTE', 'SUPERVISOR'],
    pasos: [
      {
        ancla: 'kpi-hoy',
        titulo: 'Tu día en números',
        texto: 'Acá ves ventas y pedidos de hoy frente a ayer.',
      },
      {
        ancla: 'nuevo-producto',
        titulo: 'Agregar producto',
        texto: 'Creá o editá el catálogo desde Productos.',
      },
    ],
  },
  {
    path: '/admin/empresas',
    roles: ['ADMIN'],
    pasos: [
      {
        ancla: 'buscar-tienda',
        titulo: 'Buscar tiendas',
        texto: 'Filtrá por nombre o vendedor y usá los chips de estado.',
      },
    ],
  },
  {
    path: '/admin/usuarios',
    roles: ['ADMIN'],
    pasos: [
      {
        ancla: 'filtro-usuarios',
        titulo: 'Filtros de usuarios',
        texto: 'Separá vendedores, compradores y pendientes con los chips.',
      },
    ],
  },
  {
    path: '/admin/aprobaciones',
    roles: ['ADMIN'],
    pasos: [
      {
        ancla: 'tab-empresas',
        titulo: 'Cola de moderación',
        texto: 'Empezá por negocios nuevos y promociones. El catálogo se abre al aprobar el negocio.',
      },
      {
        ancla: 'aprobar-primero',
        titulo: 'Aprobar o rechazar',
        texto: 'Cada tarjeta tiene las acciones. Empezá por la primera pendiente.',
      },
    ],
  },
  {
    path: '/admin/configuracion',
    roles: ['ADMIN'],
    pasos: [
      {
        ancla: 'config-menu',
        titulo: 'Ajustes de plataforma',
        texto: 'Comisión, categorías, política y métodos de pago viven acá.',
      },
    ],
  },
  {
    path: '/admin/pos',
    roles: ['ADMIN', 'EMPRENDEDOR', 'CAJERO', 'GERENTE', 'SUPERVISOR'],
    pasos: [
      {
        ancla: 'pos-buscar',
        titulo: 'Buscar producto',
        texto: 'Escribí el nombre o escaneá el código para agregarlo a la factura.',
      },
      {
        ancla: 'pos-cobrar',
        titulo: 'Cobrar',
        texto: 'Cuando la factura tenga ítems, cobrá acá (efectivo, SINPE o tarjeta).',
      },
    ],
  },
  {
    path: '/admin/productos',
    roles: ['EMPRENDEDOR', 'GERENTE', 'SUPERVISOR'],
    pasos: [
      {
        ancla: 'nuevo-producto',
        titulo: 'Nuevo producto',
        texto: 'Publicá un ítem nuevo o editá los que ya tenés.',
      },
    ],
  },
  {
    path: '/admin/pedidos',
    roles: ['EMPRENDEDOR', 'GERENTE', 'SUPERVISOR', 'ADMIN'],
    pasos: [
      {
        ancla: 'lista-pedidos',
        titulo: 'Pedidos',
        texto: 'Acá gestionás estados, guías y avisos al cliente.',
      },
    ],
  },

  ...guiasVendedor('', [
    {
      ancla: 'seller-menu-productos',
      titulo: 'Productos',
      texto: 'Empezá subiendo tu catálogo. Sin productos no hay ventas en la tienda ni en la caja.',
    },
    {
      ancla: 'seller-menu-pos',
      titulo: 'Caja (POS)',
      texto: 'Cuando un cliente compra en persona, cobrá desde la caja.',
    },
    {
      ancla: 'seller-menu-pedidos',
      titulo: 'Pedidos',
      texto: 'Revisá pedidos online, cambiá el estado y avisá al cliente.',
    },
  ]),
  ...guiasVendedor('productos', [
    {
      ancla: 'seller-agregar-producto',
      titulo: 'Agregar producto',
      texto: 'Tocá acá para publicar un ítem nuevo con foto, precio y stock.',
    },
    {
      ancla: 'seller-lista-productos',
      titulo: 'Tu catálogo',
      texto: 'Acá ves todo lo publicado. Entrá a uno para editarlo o eliminarlo.',
    },
  ]),
  ...guiasVendedor('pedidos', [
    {
      ancla: 'seller-filtro-pedidos',
      titulo: 'Filtros',
      texto: 'Separá pendientes, enviados y entregados para priorizar el trabajo.',
    },
    {
      ancla: 'seller-lista-pedidos',
      titulo: 'Lista de pedidos',
      texto: 'Abrí un pedido para ver detalle y marcarlo como enviado.',
    },
  ]),
  ...guiasVendedor('reportes', [
    {
      ancla: 'seller-reportes',
      titulo: 'Reportes',
      texto: 'Mirá ventas, unidades y lo que más se mueve en tu negocio.',
    },
  ]),
  ...guiasVendedor('opciones', [
    {
      ancla: 'seller-opciones-guia',
      titulo: 'Guías al entrar',
      texto: 'Podés apagar o volver a encender estas explicaciones cuando quieras.',
    },
    {
      ancla: 'seller-opciones-negocio',
      titulo: 'Datos del negocio',
      texto: 'Completá nombre, contacto y datos de tu tienda para que se vean bien.',
    },
  ]),
  ...guiasVendedor('sucursales', [
    {
      ancla: 'seller-sucursales',
      titulo: 'Sucursales',
      texto: 'Negocio Plus: acá ves locales, ventas por sucursal y el estado de cada una.',
    },
  ]),
  ...guiasVendedor('equipo', [
    {
      ancla: 'seller-equipo',
      titulo: 'Mi equipo',
      texto: 'Invitá cajeros o ayudantes para que operen la caja y los pedidos.',
    },
  ]),

  ...guiasVisitante('', [
    {
      ancla: 'vis-nav-shop',
      titulo: 'Shop',
      texto: 'Acá está todo el catálogo. Empezá buscando lo que necesitás.',
    },
    {
      ancla: 'vis-nav-carrito',
      titulo: 'Carrito',
      texto: 'Tus productos van acá. Cuando estés listo, pagás desde el carrito.',
    },
  ]),
  ...guiasVisitante('shop', [
    {
      ancla: 'vis-shop-buscar',
      titulo: 'Buscar',
      texto: 'Escribí el nombre o usá las categorías para filtrar.',
    },
    {
      ancla: 'vis-shop-lista',
      titulo: 'Productos',
      texto: 'Tocá uno para ver detalle y agregarlo al carrito.',
    },
  ]),
  ...guiasVisitante('carrito', [
    {
      ancla: 'vis-carrito-pagar',
      titulo: 'Ir a pagar',
      texto: 'Confirmá el total y seguí al checkout sin salir de esta experiencia.',
    },
  ]),
  ...guiasVisitante('cuenta', [
    {
      ancla: 'vis-cuenta-pedidos',
      titulo: 'Mis pedidos',
      texto: 'Después de comprar, acá ves el estado de tus pedidos.',
    },
    {
      ancla: 'vis-cuenta-guia',
      titulo: 'Guías al entrar',
      texto: 'Podés apagar estas explicaciones cuando ya conozcas la tienda.',
    },
  ]),
]

export function esRutaVendedor(pathname: string): boolean {
  return BASES_VENDEDOR.some((base) => pathname === base || pathname.startsWith(`${base}/`))
}

export function esRutaVisitante(pathname: string): boolean {
  return pathname === '/visitante' || pathname.startsWith('/visitante/')
}

const VISITANTE_SIN_COACH = [
  '/visitante/checkout',
  '/visitante/compra-confirmada',
  '/visitante/pago-fallido',
  '/visitante/asesor-ia',
  '/visitante/asistente',
] as const

export function esRutaConCoach(pathname: string): boolean {
  if (pathname.startsWith('/admin') || esRutaVendedor(pathname)) return true
  if (!esRutaVisitante(pathname)) return false
  const limpio = pathname.split('?')[0].replace(/\/$/, '') || '/visitante'
  return !VISITANTE_SIN_COACH.some((ruta) => limpio === ruta || limpio.startsWith(`${ruta}/`))
}

export function clavePantalla(path: string): string {
  const limpio = path.split('?')[0].replace(/\/$/, '') || '/admin'
  return `${MM_PREFIX}${limpio}`
}

export function guiaPara(pathname: string, rol: string | null | undefined): MmGuia | null {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/admin'
  const candidatas = MM_GUIAS.filter((g) => {
    const base = g.path.replace(/\/$/, '') || '/admin'
    const coincide = path === base
      || (base !== '/admin' && path.startsWith(`${base}/`))
    if (!coincide) return false
    if (!g.roles || g.roles.length === 0) return true
    if (!rol) return false
    return g.roles.includes(rol)
  })
  const exacta = candidatas.find((g) => (g.path.replace(/\/$/, '') || '/admin') === path)
  if (exacta) return exacta
  // Preferir la guía con path más largo (más específica)
  return [...candidatas].sort((a, b) => b.path.length - a.path.length)[0] ?? null
}

export function mmApagado(): boolean {
  try {
    return localStorage.getItem(MM_OFF_KEY) === '1'
  } catch {
    return true
  }
}

export function setMmApagado(apagado: boolean): void {
  try {
    if (apagado) localStorage.setItem(MM_OFF_KEY, '1')
    else localStorage.removeItem(MM_OFF_KEY)
  } catch { /* ok */ }
}

/** Borra “ya vi esta pantalla” para que las guías vuelvan a aparecer. */
export function reiniciarGuiasPantalla(): void {
  try {
    const aBorrar: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(MM_PREFIX)) aBorrar.push(key)
    }
    aBorrar.forEach((key) => localStorage.removeItem(key))
  } catch { /* ok */ }
}

/** Auto-spotlight: no molestar si ya vieron la pantalla. */
export function autoSpotlightOmitido(path: string): boolean {
  try {
    if (pantallaVista(path)) return true
    // Tour viejo solo silencia auto-spotlight en /admin
    if (localStorage.getItem(TOUR_KEY) === '1' && path.startsWith('/admin')) return true
    return false
  } catch {
    return true
  }
}

export function pantallaVista(path: string): boolean {
  try {
    return localStorage.getItem(clavePantalla(path)) === '1'
  } catch {
    return true
  }
}

export function marcarPantallaVista(path: string): void {
  try {
    localStorage.setItem(clavePantalla(path), '1')
  } catch { /* ok */ }
}

export function welcomeHecho(): boolean {
  try {
    return localStorage.getItem(MM_WELCOME_KEY) === '1'
      || localStorage.getItem(TOUR_KEY) === '1'
  } catch {
    return true
  }
}

export function marcarWelcomeHecho(): void {
  try {
    localStorage.setItem(MM_WELCOME_KEY, '1')
  } catch { /* ok */ }
}

export function welcomeSellerHecho(): boolean {
  try {
    return localStorage.getItem(MM_WELCOME_SELLER_KEY) === '1'
  } catch {
    return true
  }
}

export function marcarWelcomeSellerHecho(): void {
  try {
    localStorage.setItem(MM_WELCOME_SELLER_KEY, '1')
  } catch { /* ok */ }
}

export function welcomeVisitanteHecho(): boolean {
  try {
    return localStorage.getItem(MM_WELCOME_VISITANTE_KEY) === '1'
  } catch {
    return true
  }
}

export function marcarWelcomeVisitanteHecho(): void {
  try {
    localStorage.setItem(MM_WELCOME_VISITANTE_KEY, '1')
  } catch { /* ok */ }
}

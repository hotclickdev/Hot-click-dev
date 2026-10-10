import { RUTA_CATEGORIAS } from '@/pages/buscar/rutasBuscar'

export type Miga = { etiqueta: string; to?: string }

export type ExtraMigas = {
  actual?: string
  categoriaNombre?: string
  categoriaId?: number | string | null
  nombreTienda?: string
}

export type EtiquetasMigas = {
  inicio: string
  catalogo: string
  categoria: string
  producto: string
  categorias: string
  descubrir: string
  buscarFoto: string
  carrito: string
  checkout: string
  cuenta: string
  pedidos: string
  pedido: string
  favoritos: string
  opiniones: string
  seguridad: string
  solicitudes: string
  blog: string
  articulo: string
  servicios: string
  buscarProducto: string
  digitalizar: string
  tiendas: string
  tienda: string
  login: string
  registro: string
  ayuda: string
  contacto: string
  nosotros: string
  informacion: string
  privacidad: string
  terminos: string
  devoluciones: string
  envios: string
  cookies: string
  acuerdo: string
  emprendimientos: string
  pago: string
  seguimiento: string
  encargo: string
  cotizacion: string
  recuperar: string
  pagoListo: string
}

type Paso = { clave: keyof EtiquetasMigas; to?: string }

const RUTAS_PRINCIPALES = new Set(['/', '/emprende', '/para-pymes', '/negocio-plus-plan', '/planes'])

/** Inicio y landings que ya usan el encabezado principal: ahí no hay flechas ni migas. */
export function esRutaPrincipal(pathname: string): boolean {
  if (RUTAS_PRINCIPALES.has(pathname)) return true
  if (pathname.startsWith('/comprar/')) return true
  return pathname.startsWith('/tiendas/')
}

/** Último destino clicable: el padre de la pantalla, o el inicio. */
export function destinoAlVolver(migas: Miga[]): string {
  for (let i = migas.length - 1; i >= 0; i -= 1) {
    const to = migas[i]?.to
    if (to) return to
  }
  return '/'
}

export function migasDeRuta(
  pathname: string,
  search: string,
  etiquetas: EtiquetasMigas,
  extra: ExtraMigas = {},
): Miga[] {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const cadena = migasTienda(pathname, etiquetas, extra)
    ?? migasCatalogo(pathname, params, etiquetas, extra)
    ?? migasCuenta(pathname, params, etiquetas)
    ?? migasExacta(pathname, etiquetas)
    ?? migasRespaldo(pathname, etiquetas)
  return conEtiquetaActual(cadena, extra.actual)
}

function inicio(): Paso {
  return { clave: 'inicio', to: '/' }
}

function resolver(pasos: Paso[], etiquetas: EtiquetasMigas): Miga[] {
  return pasos.map((paso) => (
    paso.to ? { etiqueta: etiquetas[paso.clave], to: paso.to } : { etiqueta: etiquetas[paso.clave] }
  ))
}

function conEtiquetaActual(migas: Miga[], actual?: string): Miga[] {
  if (!actual || migas.length === 0) return migas
  const ultima = migas.length - 1
  return migas.map((miga, i) => (i === ultima ? { etiqueta: actual } : miga))
}

function migasTienda(pathname: string, etiquetas: EtiquetasMigas, extra: ExtraMigas): Miga[] | null {
  const coincidencia = pathname.match(/^\/tienda\/([^/]+)(\/.*)?$/)
  if (!coincidencia) return null
  const slug = coincidencia[1]
  const resto = coincidencia[2] ?? ''
  const perfil = `/tienda/${slug}`
  const nombre = extra.nombreTienda || etiquetas.tienda
  if (resto.startsWith('/producto/')) {
    return resolver([inicio(), { clave: 'tienda', to: perfil }, { clave: 'producto' }], etiquetas)
      .map((miga, i) => (i === 1 ? { ...miga, etiqueta: nombre } : miga))
  }
  if (resto === '/carrito') return pasosTienda(etiquetas, nombre, perfil, { clave: 'carrito' })
  if (resto === '/checkout') {
    return pasosTienda(etiquetas, nombre, perfil, { clave: 'carrito', to: `${perfil}/carrito` }, { clave: 'checkout' })
  }
  if (resto === '/checkout/exito') return pasosTienda(etiquetas, nombre, perfil, { clave: 'pagoListo' })
  return resolver([inicio(), { clave: 'tiendas', to: '/negocios' }, { clave: 'tienda' }], etiquetas)
    .map((miga, i) => (i === 2 ? { etiqueta: nombre } : miga))
}

function pasosTienda(etiquetas: EtiquetasMigas, nombre: string, perfil: string, ...resto: Paso[]): Miga[] {
  const migas = resolver([inicio(), { clave: 'tienda', to: perfil }, ...resto], etiquetas)
  return migas.map((miga, i) => (i === 1 ? { ...miga, etiqueta: nombre } : miga))
}

function migasCatalogo(pathname: string, params: URLSearchParams, etiquetas: EtiquetasMigas, extra: ExtraMigas): Miga[] | null {
  if (pathname === '/productos') return migasListado(params, etiquetas, extra)
  if (!/^\/productos\/[^/]+$/.test(pathname)) return null
  const migas = resolver([inicio(), { clave: 'catalogo', to: '/productos' }], etiquetas)
  if (extra.categoriaNombre) {
    const to = extra.categoriaId != null && extra.categoriaId !== ''
      ? `/productos?cat=${encodeURIComponent(String(extra.categoriaId))}`
      : undefined
    migas.push(to ? { etiqueta: extra.categoriaNombre, to } : { etiqueta: extra.categoriaNombre })
  }
  migas.push({ etiqueta: etiquetas.producto })
  return migas
}

function migasListado(params: URLSearchParams, etiquetas: EtiquetasMigas, extra: ExtraMigas): Miga[] {
  const busqueda = params.get('search')
  if (busqueda) {
    return resolver([inicio(), { clave: 'catalogo', to: '/productos' }], etiquetas).concat([{ etiqueta: busqueda }])
  }
  if (params.get('cat') || extra.categoriaNombre) {
    return resolver([inicio(), { clave: 'catalogo', to: '/productos' }], etiquetas)
      .concat([{ etiqueta: extra.categoriaNombre || etiquetas.categoria }])
  }
  return resolver([inicio(), { clave: 'catalogo', to: RUTA_CATEGORIAS }], etiquetas)
}

function migasCuenta(pathname: string, params: URLSearchParams, etiquetas: EtiquetasMigas): Miga[] | null {
  if (pathname === '/perfil') return migasPerfil(params, etiquetas)
  if (pathname === '/mis-pedidos') return resolver([inicio(), { clave: 'cuenta', to: '/perfil' }, { clave: 'pedidos' }], etiquetas)
  if (pathname.startsWith('/mis-pedidos/')) {
    return resolver([inicio(), { clave: 'cuenta', to: '/perfil' }, { clave: 'pedidos', to: '/mis-pedidos' }, { clave: 'pedido' }], etiquetas)
  }
  if (pathname === '/wishlist') return resolver([inicio(), { clave: 'cuenta', to: '/perfil' }, { clave: 'favoritos' }], etiquetas)
  if (pathname === '/servicios' && params.get('vista') === 'solicitudes') {
    return resolver([inicio(), { clave: 'cuenta', to: '/perfil' }, { clave: 'solicitudes' }], etiquetas)
  }
  return null
}

function migasPerfil(params: URLSearchParams, etiquetas: EtiquetasMigas): Miga[] {
  const vista = params.get('vista')
  const cuenta: Paso = { clave: 'cuenta', to: '/perfil' }
  if (vista === 'opiniones') return resolver([inicio(), cuenta, { clave: 'opiniones' }], etiquetas)
  if (vista === 'seguridad') return resolver([inicio(), cuenta, { clave: 'seguridad' }], etiquetas)
  return resolver([inicio(), { clave: 'cuenta' }], etiquetas)
}

const EXACTAS: Record<string, Paso[]> = {
  '/categorias': [inicio(), { clave: 'categorias' }],
  '/descubri': [inicio(), { clave: 'descubrir' }],
  '/buscar/foto': [inicio(), { clave: 'buscarFoto' }],
  '/carrito': [inicio(), { clave: 'carrito' }],
  '/checkout': [inicio(), { clave: 'carrito', to: '/carrito' }, { clave: 'checkout' }],
  '/blog': [inicio(), { clave: 'blog' }],
  '/servicios': [inicio(), { clave: 'servicios' }],
  '/servicios/buscar-producto': [inicio(), { clave: 'servicios', to: '/servicios' }, { clave: 'buscarProducto' }],
  '/servicios/digitalizar-inventario': [inicio(), { clave: 'servicios', to: '/servicios' }, { clave: 'digitalizar' }],
  '/login': [inicio(), { clave: 'login' }],
  '/registro': [inicio(), { clave: 'registro' }],
  '/recuperar-contrasena': [inicio(), { clave: 'recuperar' }],
  '/registro-empresa': [inicio(), { clave: 'registro' }],
  '/registro-empresa/activar-plan': [inicio(), { clave: 'registro', to: '/registro-empresa' }, { clave: 'pago' }],
  '/nosotros': [inicio(), { clave: 'nosotros' }],
  '/ayuda': [inicio(), { clave: 'ayuda' }],
  '/contacto': [inicio(), { clave: 'contacto' }],
  '/informacion': [inicio(), { clave: 'informacion' }],
  '/privacidad': [inicio(), { clave: 'privacidad' }],
  '/terminos': [inicio(), { clave: 'terminos' }],
  '/devoluciones': [inicio(), { clave: 'devoluciones' }],
  '/envios': [inicio(), { clave: 'envios' }],
  '/cookies': [inicio(), { clave: 'cookies' }],
  '/acuerdo-vendedores': [inicio(), { clave: 'acuerdo' }],
  '/negocios': [inicio(), { clave: 'emprendimientos' }],
  '/emprendimientos': [inicio(), { clave: 'emprendimientos' }],
  '/pago/exito': [inicio(), { clave: 'pagoListo' }],
  '/pago/cancelado': [inicio(), { clave: 'pago' }],
}

function migasExacta(pathname: string, etiquetas: EtiquetasMigas): Miga[] | null {
  if (EXACTAS[pathname]) return resolver(EXACTAS[pathname], etiquetas)
  if (pathname.startsWith('/blog/')) return resolver([inicio(), { clave: 'blog', to: '/blog' }, { clave: 'articulo' }], etiquetas)
  if (pathname.startsWith('/seguimiento/')) return resolver([inicio(), { clave: 'seguimiento' }], etiquetas)
  if (pathname.startsWith('/encargo/')) return resolver([inicio(), { clave: 'encargo' }], etiquetas)
  if (pathname.startsWith('/cotizacion/')) return resolver([inicio(), { clave: 'cotizacion' }], etiquetas)
  if (pathname.startsWith('/recuperar-carrito/')) return resolver([inicio(), { clave: 'recuperar' }], etiquetas)
  if (pathname.startsWith('/pago/')) return resolver([inicio(), { clave: 'pago' }], etiquetas)
  return null
}

function migasRespaldo(pathname: string, etiquetas: EtiquetasMigas): Miga[] {
  const segmento = pathname.split('/').filter(Boolean).at(-1) ?? ''
  const legible = segmento.replace(/[-_]/g, ' ')
  if (!legible || /^\d+$/.test(legible)) return resolver([inicio()], etiquetas)
  return [...resolver([inicio()], etiquetas), { etiqueta: legible }]
}

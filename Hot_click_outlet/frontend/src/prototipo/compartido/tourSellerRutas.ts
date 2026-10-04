import type { PasoTourId } from './tourPasos'

export type ContextoTour = {
  base: string
  emprendedor: boolean
}

export function contextoTour(pathname: string): ContextoTour | null {
  if (pathname === '/emprendedor' || pathname.startsWith('/emprendedor/')) {
    return { base: '/emprendedor', emprendedor: true }
  }
  if (pathname === '/pyme' || pathname.startsWith('/pyme/')) {
    return { base: '/pyme', emprendedor: false }
  }
  if (pathname === '/negocio-plus' || pathname.startsWith('/negocio-plus/')) {
    return { base: '/negocio-plus', emprendedor: false }
  }
  return null
}

export function rutasDePasos(ctx: ContextoTour): Record<PasoTourId, string> {
  const cuenta = (segmento: string) => (
    ctx.emprendedor ? `${ctx.base}/opciones/${segmento}` : `${ctx.base}/${segmento}`
  )
  return {
    bodega: cuenta('bodegas'),
    producto: `${ctx.base}/productos`,
    cobro: cuenta('cobro'),
    negocio: cuenta('negocio'),
    tienda: `${ctx.base}/tienda`,
  }
}

export function pasoDeRuta(pathname: string): PasoTourId | null {
  const partes = pathname.split('/').filter(Boolean)
  if (partes.includes('bodegas')) return 'bodega'
  if (partes.includes('productos')) return 'producto'
  if (partes.includes('cobro')) return 'cobro'
  if (partes.includes('negocio')) return 'negocio'
  if (partes.includes('tienda')) return 'tienda'
  return null
}

export function claveTour(userId: string | number, empresaId: string | number, sufijo: string): string {
  return `hc-tour-seller:${userId}:${empresaId}:${sufijo}`
}

export type PreferenciasTour = {
  descartado: boolean
  minimizado: boolean
  vioTienda: boolean
}

export function leerPreferencias(
  storage: Pick<Storage, 'getItem'>,
  userId: string | number,
  empresaId: string | number,
): PreferenciasTour {
  const leer = (sufijo: string) => {
    try {
      return storage.getItem(claveTour(userId, empresaId, sufijo)) === '1'
    } catch {
      return false
    }
  }
  return {
    descartado: leer('descartado'),
    minimizado: leer('minimizado'),
    vioTienda: leer('tienda'),
  }
}

export function guardarPreferencia(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  userId: string | number,
  empresaId: string | number,
  sufijo: 'descartado' | 'minimizado' | 'tienda',
  activo: boolean,
) {
  const clave = claveTour(userId, empresaId, sufijo)
  try {
    if (activo) storage.setItem(clave, '1')
    else storage.removeItem(clave)
  } catch {
    /* el navegador puede bloquear storage */
  }
}

import { rutaConPrefijo, rutaCuentaSeller } from '@/utils/planPaths'

/** La caja vive fuera del prefijo del plan y se abre a pantalla completa, sin la barra inferior. */
export const RUTA_CAJA_POS = '/admin/pos'

export type ClaveItemMas = 'tienda' | 'reportes' | 'equipo' | 'bodegas' | 'planes' | 'opciones'

export type ItemMas = Readonly<{
  clave: ClaveItemMas
  etiqueta: string
  to: string
}>

// TODO copy Producto: etiquetas de «Más» hasta que 01-inicio las defina con clave.
const ETIQUETAS_MAS: Record<ClaveItemMas, string> = {
  tienda: 'Tienda',
  reportes: 'Reportes',
  equipo: 'Equipo',
  bodegas: 'Bodegas',
  planes: 'Planes',
  opciones: 'Opciones',
}

const ORDEN_MAS: readonly ClaveItemMas[] = ['tienda', 'reportes', 'equipo', 'bodegas', 'planes', 'opciones']

/** Segmento de cada destino de «Más». Emprendedor anida equipo, bodegas y plan bajo `opciones/*`. */
function segmentoMas(clave: ClaveItemMas, planApi: string): string {
  if (clave === 'tienda') return 'tienda'
  if (clave === 'reportes') return 'reportes'
  if (clave === 'opciones') return 'opciones'
  if (clave === 'planes') return rutaCuentaSeller(planApi, 'plan')
  return rutaCuentaSeller(planApi, clave)
}

export function itemsMas(base: string, planApi: string): ItemMas[] {
  return ORDEN_MAS.map((clave) => ({
    clave,
    etiqueta: ETIQUETAS_MAS[clave],
    to: rutaConPrefijo(base, segmentoMas(clave, planApi)),
  }))
}

export function rutasBarra(base: string) {
  return {
    inicio: base,
    pedidos: rutaConPrefijo(base, 'pedidos'),
    productos: rutaConPrefijo(base, 'productos'),
  }
}

export function pathEstaEnRuta(pathname: string, ruta: string): boolean {
  return pathname === ruta || pathname.startsWith(`${ruta}/`)
}

export function esInicio(pathname: string, base: string): boolean {
  return pathname === base || pathname === `${base}/`
}

/** «Más» queda activo cuando la pantalla actual es uno de sus destinos (o cuelga de ellos). */
export function esRutaDeMas(pathname: string, base: string, planApi: string): boolean {
  return itemsMas(base, planApi).some((item) => pathEstaEnRuta(pathname, item.to))
}

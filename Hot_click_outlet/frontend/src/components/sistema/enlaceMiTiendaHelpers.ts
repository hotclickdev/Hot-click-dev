import { urlAbsolutaDesdeRuta } from '@/utils/rutaTienda'

export type EstadoEnlaceTienda =
  | { tipo: 'ninguno' }
  | { tipo: 'publica'; url: string; ruta: string }
  | { tipo: 'pendiente'; url: string; aviso: string }

/** S1-20: qué muestra el panel sobre la dirección de la tienda. */
export function estadoEnlaceTienda(slug: string | null | undefined, tiendaPublica: boolean, estadoEmpresa?: string | null): EstadoEnlaceTienda {
  if (!slug) return { tipo: 'ninguno' }
  const ruta = `/tienda/${slug}`
  const url = urlAbsolutaDesdeRuta(ruta) ?? ruta
  if (tiendaPublica) return { tipo: 'publica', url, ruta }
  const aviso = estadoEmpresa === 'PENDIENTE_APROBACION'
    ? 'Todavía no es pública: se publica cuando HotClick apruebe tu negocio.'
    : 'Todavía no es pública.'
  return { tipo: 'pendiente', url, aviso }
}

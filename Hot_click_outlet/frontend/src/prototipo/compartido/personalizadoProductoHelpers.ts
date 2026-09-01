export type ModoPrecioPersonalizado = 'FIJO' | 'RANGO' | 'COTIZACION'

/** Fase 1 default: todo personalizado se publica sin precio público; se cotiza después. */
export const MODO_PRECIO_PERSONALIZADO_FASE1: ModoPrecioPersonalizado = 'COTIZACION'

/** Feature flag: habilita selector FIJO/RANGO/COTIZACION en formularios seller. */
export function modosPrecioPersonalizadoHabilitados(): boolean {
  return import.meta.env.VITE_PERSONALIZADO_MODOS_PRECIO === 'true'
}

export const MODOS_PRECIO_PERSONALIZADO: ReadonlyArray<{
  valor: ModoPrecioPersonalizado
  titulo: string
  ayuda: string
}> = [
  { valor: 'FIJO', titulo: 'Precio fijo', ayuda: 'El cliente paga de una vez.' },
  { valor: 'RANGO', titulo: 'Rango', ayuda: 'Mostrás desde–hasta y cotizás dentro del rango.' },
  { valor: 'COTIZACION', titulo: 'Cotización', ayuda: 'Sin precio público: revisás y cotizás después.' },
]

type PreciosPublicacion = Readonly<{
  precioCompra: string
  precioVenta: string
  modoPrecioPersonalizado?: ModoPrecioPersonalizado
  precioPersonalizadoMin?: string
  precioPersonalizadoMax?: string
}>

type OpcionesPrecios = Readonly<{
  modoPrecio?: ModoPrecioPersonalizado
  precioMin?: string
  precioMax?: string
}>

/** Precios a persistir al publicar (catálogo vs personalizado). */
export function preciosAlPublicar(
  personalizado: boolean,
  compraCatalogo: string,
  ventaCatalogo: string,
  opciones: OpcionesPrecios = {},
): PreciosPublicacion {
  if (!personalizado) {
    return { precioCompra: compraCatalogo, precioVenta: ventaCatalogo }
  }
  if (!modosPrecioPersonalizadoHabilitados()) {
    return {
      precioCompra: '0',
      precioVenta: '0',
      modoPrecioPersonalizado: MODO_PRECIO_PERSONALIZADO_FASE1,
    }
  }
  const modo = opciones.modoPrecio ?? MODO_PRECIO_PERSONALIZADO_FASE1
  if (modo === 'FIJO') {
    return {
      precioCompra: compraCatalogo,
      precioVenta: ventaCatalogo,
      modoPrecioPersonalizado: 'FIJO',
    }
  }
  if (modo === 'RANGO') {
    return {
      precioCompra: '0',
      precioVenta: opciones.precioMin || '0',
      modoPrecioPersonalizado: 'RANGO',
      precioPersonalizadoMin: opciones.precioMin,
      precioPersonalizadoMax: opciones.precioMax,
    }
  }
  return {
    precioCompra: '0',
    precioVenta: '0',
    modoPrecioPersonalizado: 'COTIZACION',
  }
}

export function tituloFormProducto(editar: boolean, personalizado: boolean): string {
  if (editar) return personalizado ? 'Editar personalizado' : 'Editar Producto'
  if (personalizado) return 'Producto personalizado'
  return 'Nuevo Producto'
}

export function etiquetaPrecioProducto(
  esPersonalizado: boolean,
  modo?: string | null,
  precio?: number,
  min?: number | null,
  max?: number | null,
): string | null {
  if (!esPersonalizado) return null
  if (modo === 'FIJO' && precio != null) return null
  if (modo === 'RANGO' && min != null && max != null) {
    const fmt = (n: number) => new Intl.NumberFormat('es-CR').format(n)
    return `₡${fmt(min)} – ₡${fmt(max)}`
  }
  return 'A cotizar'
}

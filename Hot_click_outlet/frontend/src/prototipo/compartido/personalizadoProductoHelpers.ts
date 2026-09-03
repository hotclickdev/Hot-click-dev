export type ModoPrecioPersonalizado = 'FIJO' | 'RANGO' | 'COTIZACION'

/** Default al crear: cotización hasta que el vendedor elija otra forma de cobro. */
export const MODO_PRECIO_PERSONALIZADO_FASE1: ModoPrecioPersonalizado = 'COTIZACION'

/** El API exige precioVenta ≥ 1. Cotización usa ₡1 de placeholder (igual que el wizard admin). */
export const PRECIO_VENTA_PLACEHOLDER_COTIZACION = '1'

export const MODOS_PRECIO_PERSONALIZADO: ReadonlyArray<{
  valor: ModoPrecioPersonalizado
  titulo: string
  ayuda: string
}> = [
  { valor: 'FIJO', titulo: 'Precio fijo', ayuda: 'El cliente paga de una vez.' },
  { valor: 'COTIZACION', titulo: 'Cotización', ayuda: 'Sin precio público: revisás y cotizás después.' },
  { valor: 'RANGO', titulo: 'Rango de precio', ayuda: 'Mostrás desde–hasta y cotizás dentro del rango.' },
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
      precioVenta: precioAlMenosUno(opciones.precioMin),
      modoPrecioPersonalizado: 'RANGO',
      precioPersonalizadoMin: opciones.precioMin,
      precioPersonalizadoMax: opciones.precioMax,
    }
  }
  return {
    precioCompra: '0',
    precioVenta: PRECIO_VENTA_PLACEHOLDER_COTIZACION,
    modoPrecioPersonalizado: 'COTIZACION',
  }
}

function precioAlMenosUno(valor: string | undefined): string {
  return Number(valor) >= 1 ? String(valor) : PRECIO_VENTA_PLACEHOLDER_COTIZACION
}

/** Validación de precios del formulario seller (personalizado). */
export function errorPreciosPersonalizado(
  personalizado: boolean,
  modo: ModoPrecioPersonalizado,
  venta: string,
  precioMin: string,
  precioMax: string,
): string | null {
  if (!personalizado) return null
  if (modo === 'RANGO' && (!precioMin || !precioMax)) {
    return 'Indicá el rango de precio (mínimo y máximo).'
  }
  if (modo === 'RANGO' && Number(precioMin) > Number(precioMax)) {
    return 'El precio mínimo no puede ser mayor que el máximo.'
  }
  if (modo === 'FIJO' && Number(venta) < 1) {
    return 'Indicá el precio de venta.'
  }
  return null
}

export function errorCatalogoProducto(personalizado: boolean, venta: string, stock: string): string | null {
  if (personalizado) return null
  if (Number(venta) < 1) return 'Indicá el precio de venta.'
  if (Number(stock) < 1) return 'Indicá el stock (mínimo 1 para que se vea en el catálogo).'
  return null
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

import { useEffect, useState } from 'react'
import { abandonedCartService } from '@/services/abandonedCartService'
import { productService } from '@/services/productService'
import type { ItemCarritoAbandonado } from '@/types/carrito'
import type { Producto } from '@/types/producto'

/** Línea guardada en el correo, con el producto tal como está hoy (`null` si ya no existe). */
export type ProductoRecuperado = {
  clave: string
  nombre: string
  imagen: string
  cantidad: number
  producto: Producto | null
}

type EstadoCarga = 'cargando' | 'listo' | 'error'

export function estaDisponible(linea: ProductoRecuperado): linea is ProductoRecuperado & { producto: Producto } {
  return linea.producto != null && linea.producto.stock > 0
}

/** Lo que falta sumar para que el carrito quede con lo recuperado; abrir el enlace dos veces no duplica. */
export function unidadesPorAgregar(linea: ProductoRecuperado & { producto: Producto }, enCarrito: number): number {
  return Math.max(0, Math.min(linea.cantidad, linea.producto.stock) - enCarrito)
}

export function subtotalRecuperado(lineas: ProductoRecuperado[]): number {
  return lineas
    .filter(estaDisponible)
    .reduce((suma, l) => suma + l.producto.precio * Math.min(l.cantidad, l.producto.stock), 0)
}

type CuerpoRecuperar = { items?: ItemCarritoAbandonado[]; data?: { items?: ItemCarritoAbandonado[] } }

/** El interceptor de `api` suele desenvolver el `ResponseDTO`; se aceptan ambas formas. */
function itemsDeRespuesta(data: unknown): ItemCarritoAbandonado[] {
  const cuerpo = data as CuerpoRecuperar | null
  return cuerpo?.items ?? cuerpo?.data?.items ?? []
}

async function productoActual(productoId: ItemCarritoAbandonado['productoId']): Promise<Producto | null> {
  if (productoId == null) return null
  try {
    const { data } = await productService.getById(productoId)
    return data ?? null
  } catch (err) {
    console.warn('[RecuperarCarrito] producto no disponible', productoId, err)
    return null
  }
}

async function cargarLineas(token: string): Promise<ProductoRecuperado[]> {
  const { data } = await abandonedCartService.getAbandonedCart(token)
  const items = itemsDeRespuesta(data)
  const productos = await Promise.all(items.map((item) => productoActual(item.productoId)))
  return items.map((item, indice) => ({
    clave: `${item.productoId ?? 'sin-id'}-${indice}`,
    nombre: productos[indice]?.nombre ?? item.nombre ?? item.nombreProducto ?? '',
    imagen: productos[indice]?.imagenUrl || item.imagenUrl || item.imagenPrincipalUrl || '',
    cantidad: item.cantidad ?? 1,
    producto: productos[indice],
  }))
}

/** Carga el carrito guardado del enlace del correo y cruza cada línea con el stock actual. */
export function useCarritoRecuperado(token: string | undefined) {
  const [lineas, setLineas] = useState<ProductoRecuperado[]>([])
  const [estado, setEstado] = useState<EstadoCarga>(token ? 'cargando' : 'error')

  useEffect(() => {
    if (!token) return
    let vigente = true
    cargarLineas(token)
      .then((resultado) => {
        if (!vigente) return
        setLineas(resultado)
        setEstado(resultado.some(estaDisponible) ? 'listo' : 'error')
      })
      .catch((err: unknown) => {
        console.warn('[RecuperarCarrito] enlace inválido o vencido', err)
        if (vigente) setEstado('error')
      })
    return () => { vigente = false }
  }, [token])

  return { lineas, estado }
}

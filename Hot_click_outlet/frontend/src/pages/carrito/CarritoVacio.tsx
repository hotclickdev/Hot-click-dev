import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import { productService, normalizeProduct } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import type { Producto } from '@/types/producto'
import CartEmptyState from './CartEmptyState'
import CrossSellGrid from './CrossSellGrid'
import {
  CROSS_ADDED_FEEDBACK_MS,
  CROSS_SELL_LIMITE,
  FALLBACK_CATALOGO_SIZE,
  listaProductosDesdeRespuesta,
  seleccionarCrossSell,
} from './cartHelpers'

async function cargarSugerencias(): Promise<Producto[]> {
  const sinCarrito = new Set<Producto['id']>()
  const { data } = await productService.getDestacados()
  const destacados = listaProductosDesdeRespuesta(data)
    .map((item) => normalizeProduct(item))
    .filter((p): p is Producto => p != null)
  const filtrados = seleccionarCrossSell(destacados, sinCarrito, CROSS_SELL_LIMITE)
  if (filtrados.length > 0) return filtrados
  const { data: catalogo } = await productService.getAll(0, FALLBACK_CATALOGO_SIZE)
  const fallback = listaProductosDesdeRespuesta(catalogo)
    .map((item) => normalizeProduct(item))
    .filter((p): p is Producto => p != null)
  return seleccionarCrossSell(fallback, sinCarrito, CROSS_SELL_LIMITE)
}

/** Carrito vacío con sugerencias; su diseño Figma llega con los estados vacíos. */
export default function CarritoVacio() {
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const { t } = useTranslation()
  const [sugerencias, setSugerencias] = useState<Producto[]>([])
  const [agregados, setAgregados] = useState<Set<Producto['id']>>(new Set())

  useEffect(() => {
    cargarSugerencias()
      .then(setSugerencias)
      .catch((error: unknown) => console.error('No se pudieron cargar sugerencias del carrito', error))
  }, [])

  function agregar(product: Producto) {
    addItem(product)
    toast({ message: t('comprador.tarjeta.agregado', { nombre: product.nombre }), type: 'success' })
    setAgregados((prev) => new Set([...prev, product.id]))
    setTimeout(() => {
      setAgregados((prev) => {
        const siguiente = new Set(prev)
        siguiente.delete(product.id)
        return siguiente
      })
    }, CROSS_ADDED_FEEDBACK_MS)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <CartEmptyState />
      <CrossSellGrid products={sugerencias} addedIds={agregados} onAdd={agregar} variant="vacio" />
    </div>
  )
}

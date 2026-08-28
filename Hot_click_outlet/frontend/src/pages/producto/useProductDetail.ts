import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { analytics } from '@/utils/analytics'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import {
  parseTallas,
  listaProductosDesdePagina,
  variantesDesdeRespuesta,
  listaImagenesProducto,
  nombreError,
} from './productoHelpers'
import type { VarianteProducto } from './productoHelpers'

export function useProductDetail(id: string | undefined, t: TFunction) {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()

  const [product, setProduct] = useState<Producto | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [recommendations, setRecommendations] = useState<Producto[]>([])
  const [brandProducts, setBrandProducts] = useState<Producto[]>([])
  const [galeria, setGaleria] = useState<string[]>([])
  const [activeImg, setActiveImg] = useState(0)
  const [variantes, setVariantes] = useState<VarianteProducto[]>([])
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string | null>(null)
  const addTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mainCTARef = useRef<HTMLButtonElement>(null)
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem)
  const recentlyViewed = useRecentlyViewedStore((s) => s.items)

  useEffect(() => {
    const controller = new AbortController()
    /* eslint-disable react-hooks/set-state-in-effect -- reset de ficha al cambiar id */
    setLoading(true)
    setRecommendations([])
    setGaleria([])
    setActiveImg(0)
    /* eslint-enable react-hooks/set-state-in-effect */
    productService.getById(id as Id)
      .then(({ data }) => {
        const p = normalizeProduct(data)
        if (!p) {
          setProduct(null)
          return
        }
        setProduct(p)
        setTallaSeleccionada(parseTallas(p.talla)[0] ?? null)
        addRecentlyViewed(p)
        analytics.productView(p)
        if (p.especificaciones?.trim()) setActiveTab('especificaciones')
        else if (p.comoUsar?.trim()) setActiveTab('como-usar')
      })
      .catch((err: unknown) => { if (nombreError(err) !== 'CanceledError') navigate('/productos') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga solo al cambiar el id de ruta
  }, [id])

  useEffect(() => {
    if (!product?.id) return
    productService.getImagenes(product.id)
      .then((r) => {
        const imgs = listaImagenesProducto(r.data)
        const urls = imgs
          .sort((a, b) => Number(a.posicion ?? 0) - Number(b.posicion ?? 0))
          .map((i) => i.urlImagen)
          .filter((u): u is string => Boolean(u) && typeof u === 'string')
        if (urls.length > 0) {
          const main = product.imagenUrl
          const todas = main ? [main, ...urls.filter((u) => u !== main)] : urls
          setGaleria(todas)
        } else {
          setGaleria(product.imagenUrl ? [product.imagenUrl] : [])
        }
      })
      .catch(() => { setGaleria(product.imagenUrl ? [product.imagenUrl] : []) })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- galería sigue al id; imagenUrl es del mismo producto
  }, [product?.id])

  useEffect(() => {
    if (!product) return
    const controller = new AbortController()
    productService.getRecommendations(product.id as Id, { signal: controller.signal })
      .then((recs) => setRecommendations(recs))
      .catch((err: unknown) => { console.error(err) })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomendaciones por id de producto
  }, [product?.id])

  useEffect(() => {
    if (!product?.marcaId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin marca no hay carrusel
      setBrandProducts([])
      return
    }
    const controller = new AbortController()
    productService.getByMarca(product.marcaId, 0, 8)
      .then(({ data }) => {
        const items = listaProductosDesdePagina(data).filter((p) => p.id !== product.id).slice(0, 6)
        setBrandProducts(items)
      })
      .catch((err: unknown) => { console.error(err) })
    return () => controller.abort()
  }, [product?.marcaId, product?.id])

  useEffect(() => {
    if (!product?.grupoVarianteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin grupo no hay swatches
      setVariantes([])
      return
    }
    const controller = new AbortController()
    productService.getVariantes(product.id as Id, { signal: controller.signal })
      .then((vs) => setVariantes(variantesDesdeRespuesta(vs).filter((v) => v.id !== product.id)))
      .catch((err: unknown) => { console.error(err) })
    return () => controller.abort()
  }, [product?.grupoVarianteId, product?.id])

  useEffect(() => () => clearTimeout(addTimeout.current ?? undefined), [])

  useEffect(() => {
    if (loading) return
    const el = mainCTARef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(entry.isIntersecting === false),
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])

  const inStock = product ? product.stock > 0 : false
  const atMax = product ? quantity >= product.stock : false

  const handleDecrease = () => setQuantity((q) => Math.max(1, q - 1))

  const handleIncrease = () => {
    if (atMax) {
      toast({
        message: t('product.lowStock', { count: product!.stock }),
        type: 'warning',
      })
      return
    }
    setQuantity((q) => q + 1)
  }

  const handleAdd = () => {
    if (!inStock || justAdded) return
    agregarAlPedido({ conAviso: true })
  }

  const handleComprarAhora = () => {
    if (!inStock) return
    if (!justAdded) agregarAlPedido({ conAviso: false })
    navigate('/checkout')
  }

  function agregarAlPedido({ conAviso }: { conAviso: boolean }) {
    const productoActual = product as Producto
    addItem({ ...normalizeProduct(productoActual), tallaSeleccionada } as Producto, quantity)
    if (!conAviso) return
    const qtyPrefix = quantity > 1 ? `${quantity}× ` : ''
    toast({
      message: t('product.added', { name: `${qtyPrefix}${productoActual.nombre}` }),
      type: 'success',
    })
    setJustAdded(true)
    addTimeout.current = setTimeout(() => setJustAdded(false), 1400)
  }

  return {
    product, loading, quantity, activeTab, setActiveTab, justAdded, showSticky,
    recommendations, brandProducts, galeria, activeImg, setActiveImg,
    variantes, tallaSeleccionada, setTallaSeleccionada, mainCTARef,
    recentlyViewed, inStock, atMax, handleDecrease, handleIncrease, handleAdd,
    handleComprarAhora,
  }
}

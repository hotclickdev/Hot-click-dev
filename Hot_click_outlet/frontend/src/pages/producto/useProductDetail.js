import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { analytics } from '@/utils/analytics'
import { parseTallas } from './productoHelpers'

/**
 * Estado, fetches y handlers de la ficha de producto.
 * @param {string} id
 * @param {function} t
 */
export function useProductDetail(id, t) {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState(null)
  const [justAdded, setJustAdded] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [brandProducts, setBrandProducts] = useState([])
  const [galeria, setGaleria] = useState([])
  const [activeImg, setActiveImg] = useState(0)
  const [variantes, setVariantes] = useState([])
  const [tallaSeleccionada, setTallaSeleccionada] = useState(null)
  const addTimeout = useRef(null)
  const mainCTARef = useRef(null)
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
    productService.getById(id, { signal: controller.signal })
      .then(({ data }) => {
        const p = normalizeProduct(data)
        setProduct(p)
        setTallaSeleccionada(parseTallas(p.talla)[0] ?? null)
        addRecentlyViewed(p)
        analytics.productView(p)
        if (p.especificaciones?.trim()) setActiveTab('especificaciones')
        else if (p.comoUsar?.trim()) setActiveTab('como-usar')
      })
      .catch((err) => { if (err.name !== 'CanceledError') navigate('/productos') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga solo al cambiar el id de ruta
  }, [id])

  useEffect(() => {
    if (!product?.id) return
    productService.getImagenes(product.id)
      .then((r) => {
        const imgs = (r.data?.data ?? r.data ?? [])
        const urls = imgs
          .sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0))
          .map((i) => i.urlImagen)
          .filter(Boolean)
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

  // Fetch same-category recommendations
  useEffect(() => {
    if (!product) return
    const controller = new AbortController()
    productService.getRecommendations(product.id, { signal: controller.signal })
      .then((recs) => setRecommendations(recs))
      .catch((err) => { console.error(err) })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomendaciones por id de producto
  }, [product?.id])

  // Fetch same-brand products
  useEffect(() => {
    if (!product?.marcaId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin marca no hay carrusel
      setBrandProducts([])
      return
    }
    const controller = new AbortController()
    productService.getByMarca(product.marcaId, 0, 8)
      .then(({ data }) => {
        const items = (data?.content ?? data ?? []).filter((p) => p.id !== product.id).slice(0, 6)
        setBrandProducts(items)
      })
      .catch((err) => { console.error(err) })
    return () => controller.abort()
  }, [product?.marcaId, product?.id])

  // Otros colores de la misma pieza (swatches)
  useEffect(() => {
    if (!product?.grupoVarianteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin grupo no hay swatches
      setVariantes([])
      return
    }
    const controller = new AbortController()
    productService.getVariantes(product.id, { signal: controller.signal })
      .then((vs) => setVariantes(vs.filter((v) => v.id !== product.id)))
      .catch((err) => { console.error(err) })
    return () => controller.abort()
  }, [product?.grupoVarianteId, product?.id])

  useEffect(() => () => clearTimeout(addTimeout.current), [])

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
        message: t('product.lowStock', { count: product.stock }),
        type: 'warning',
      })
      return
    }
    setQuantity((q) => q + 1)
  }

  const handleAdd = () => {
    if (!inStock || justAdded) return
    addItem({ ...normalizeProduct(product), tallaSeleccionada }, quantity)
    const qtyPrefix = quantity > 1 ? `${quantity}× ` : ''
    toast({
      message: t('product.added', { name: `${qtyPrefix}${product.nombre}` }),
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
  }
}

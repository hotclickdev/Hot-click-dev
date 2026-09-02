import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { analytics } from '@/utils/analytics'
import { bumpGustosDesdeVista } from '@/utils/gustos'
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
import type { PersonalizacionCarrito } from '@/types/carrito'
import { encargoService, encargoDesdeRespuesta } from '@/services/encargoService'
import useAuthStore from '@/store/authStore'

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
  const [personalizacion, setPersonalizacion] = useState<PersonalizacionCarrito>({ imagenes: [], notas: '' })
  const [contactoEncargo, setContactoEncargo] = useState({ nombre: '', email: '', telefono: '' })
  const [enviandoEncargo, setEnviandoEncargo] = useState(false)
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
        bumpGustosDesdeVista(p)
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
    if (justAdded) return
    if (product?.esPersonalizado && product.modoPrecioPersonalizado !== 'FIJO') {
      void handleSolicitarEncargo()
      return
    }
    if (!inStock) return
    if (product?.esPersonalizado && !tieneReferencia(personalizacion)) {
      toast({ message: 'Subí al menos una imagen o escribí notas para el artista', type: 'warning' })
      return
    }
    agregarAlPedido({ conAviso: true })
  }

  const handleComprarAhora = () => {
    if (product?.esPersonalizado && product.modoPrecioPersonalizado !== 'FIJO') {
      void handleSolicitarEncargo()
      return
    }
    if (!inStock) return
    if (product?.esPersonalizado && !tieneReferencia(personalizacion)) {
      toast({ message: 'Subí al menos una imagen o escribí notas para el artista', type: 'warning' })
      return
    }
    if (!justAdded) agregarAlPedido({ conAviso: false })
    navigate('/checkout')
  }

  async function handleSolicitarEncargo() {
    if (!product || enviandoEncargo) return
    if (!tieneReferencia(personalizacion)) {
      toast({ message: 'Subí al menos una imagen o escribí notas para el artista', type: 'warning' })
      return
    }
    const userName = useAuthStore.getState().userName
    const userEmail = useAuthStore.getState().userEmail
    const nombre = contactoEncargo.nombre.trim() || userName || ''
    const email = contactoEncargo.email.trim() || userEmail || ''
    if (!nombre || !email) {
      toast({ message: 'Indicá tu nombre y email para enviar el encargo', type: 'warning' })
      return
    }
    if (personalizacion.presupuestoTipo === 'RANGO') {
      const min = Number(personalizacion.presupuestoMin)
      const max = Number(personalizacion.presupuestoMax)
      if (!min || !max || max < min) {
        toast({ message: 'Indicá un rango de presupuesto válido o elegí sin presupuesto', type: 'warning' })
        return
      }
    }
    setEnviandoEncargo(true)
    try {
      const presupuestoTipo = personalizacion.presupuestoTipo ?? 'SIN_PRESUPUESTO'
      const { data } = await encargoService.crear({
        productoId: product.id as Id,
        nombreCliente: nombre,
        email,
        telefono: contactoEncargo.telefono.trim() || undefined,
        notas: personalizacion.notas,
        tallaSeleccionada: tallaSeleccionada || undefined,
        imagenes: personalizacion.imagenes || [],
        presupuestoTipo,
        presupuestoMin: presupuestoTipo === 'RANGO' ? Number(personalizacion.presupuestoMin) : undefined,
        presupuestoMax: presupuestoTipo === 'RANGO' ? Number(personalizacion.presupuestoMax) : undefined,
      })
      const encargo = encargoDesdeRespuesta(data)
      toast({ message: 'Encargo enviado. Te avisaremos cuando el artista responda.', type: 'success' })
      if (encargo?.tokenPublico) navigate(`/encargo/${encargo.tokenPublico}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo enviar el encargo', type: 'error' })
    } finally {
      setEnviandoEncargo(false)
    }
  }

  function agregarAlPedido({ conAviso }: { conAviso: boolean }) {
    const productoActual = product as Producto
    const pers = productoActual.esPersonalizado
      ? {
          ...personalizacion,
          tallaSeleccionada: tallaSeleccionada || personalizacion.tallaSeleccionada,
        }
      : undefined
    addItem({
      ...normalizeProduct(productoActual),
      tallaSeleccionada,
      personalizacion: pers,
    } as Producto, quantity)
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
    personalizacion, setPersonalizacion, contactoEncargo, setContactoEncargo, enviandoEncargo,
  }
}

function tieneReferencia(p: PersonalizacionCarrito) {
  const imgs = (p.imagenes || []).some(Boolean)
  const notas = Boolean(p.notas?.trim())
  return imgs || notas
}

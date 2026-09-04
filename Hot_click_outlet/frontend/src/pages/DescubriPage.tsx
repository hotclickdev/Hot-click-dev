import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Seo from '@/components/seo/Seo'
import { productService, normalizeProduct } from '@/services/productService'
import useWishlistStore from '@/store/wishlistStore'
import { analytics } from '@/utils/analytics'
import {
  aplicarLikeProducto,
  debeRevelar,
  hasGustos,
  loadGustos,
  loadRecentlyViewedIds,
  marcarProductoVisto,
  productoEsRelacionado,
  productoYaVisto,
  rankScoreParaVos,
} from '@/utils/gustos'
import { useGustosPerfil } from '@/hooks/useGustosPerfil'
import type { CatalogCategoria } from '@/pages/catalogo/catalogoTipos'
import type { Producto, ProductoBackend } from '@/types/producto'
import type { Id, Pagina } from '@/types/api'
import DescubriHeader from './descubri/DescubriHeader'
import DescubriLoading from './descubri/DescubriLoading'
import DescubriError from './descubri/DescubriError'
import DescubriMazo from './descubri/DescubriMazo'
import DescubriRevelacion from './descubri/DescubriRevelacion'
import DescubriResultados, { type NegocioRecomendado } from './descubri/DescubriResultados'

type Fase = 'mazo' | 'revelando' | 'resultados'
type Status = 'loading' | 'ready' | 'error'

function listaProductos(data: unknown): Producto[] {
  let raw: ProductoBackend[] = []
  if (Array.isArray(data)) raw = data as ProductoBackend[]
  else if (data && typeof data === 'object' && 'content' in data) {
    const pagina = data as Pagina<ProductoBackend>
    raw = Array.isArray(pagina.content) ? pagina.content : []
  }
  return raw
    .map((p) => normalizeProduct(p))
    .filter((p): p is Producto => !!p && !!p.imagenUrl && (p.stock ?? 0) > 0)
}

function normalizarCategorias(data: unknown): CatalogCategoria[] {
  if (!Array.isArray(data)) return []
  const out: CatalogCategoria[] = []
  for (const raw of data) {
    const c = raw as CatalogCategoria & { idCategoria?: unknown }
    const idRaw = c.id ?? c.idCategoria
    if (idRaw == null || String(idRaw) === '') continue
    out.push({
      ...c,
      id: idRaw as Id,
      padreId: c.padreId ?? c.categoriaPadre?.id ?? c.parentId ?? null,
    })
  }
  return out
}

function negociosDesdeLikes(liked: Producto[]): NegocioRecomendado[] {
  const seen = new Set<string>()
  const out: NegocioRecomendado[] = []
  for (const p of liked) {
    const slug = p.empresaSlug?.trim()
    const nombre = p.empresaNombre?.trim()
    if (!slug || !nombre || seen.has(slug)) continue
    seen.add(slug)
    out.push({ slug, nombre })
  }
  return out
}

export default function DescubriPage() {
  const { t } = useTranslation()
  const { perfil, refreshLocal } = useGustosPerfil()
  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const isLiked = useWishlistStore((s) => s.isLiked)

  const [status, setStatus] = useState<Status>('loading')
  const [fase, setFase] = useState<Fase>('mazo')
  const [categories, setCategories] = useState<CatalogCategoria[]>([])
  const [products, setProducts] = useState<Producto[]>([])
  /** Mazo fijo de la sesión (no se refiltra al marcar seen). */
  const [deck, setDeck] = useState<Producto[]>([])
  const [indice, setIndice] = useState(0)
  const [likes, setLikes] = useState(0)
  const [swipes, setSwipes] = useState(0)
  const [likedProducts, setLikedProducts] = useState<Producto[]>([])
  const inicioTracked = useRef(false)
  const revelacionTracked = useRef(false)

  const armarMazo = useCallback((prods: Producto[]) => {
    const p = loadGustos()
    const noVistos = prods.filter((prod) => !productoYaVisto(prod.id, p))
    setDeck(noVistos)
    setIndice(0)
    setLikes(0)
    setSwipes(0)
    if (noVistos.length === 0 && hasGustos(p)) setFase('resultados')
    else setFase('mazo')
  }, [])

  const load = useCallback(() => {
    setStatus('loading')
    Promise.all([
      productService.getCategories(),
      productService.getAll(0, 100),
    ])
      .then(([catsRes, prodRes]) => {
        const cats = normalizarCategorias(catsRes.data)
        const prods = listaProductos(prodRes.data)
        setCategories(cats)
        setProducts(prods)
        armarMazo(prods)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [armarMazo])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (status !== 'ready' || inicioTracked.current) return
    if (fase === 'mazo') {
      inicioTracked.current = true
      analytics.descubriInicio(deck.length)
    }
  }, [status, fase, deck.length])

  const relacionados = useMemo(() => {
    if (!hasGustos(perfil) && likedProducts.length === 0) return []
    const viewed = loadRecentlyViewedIds()
    const ranked = hasGustos(perfil)
      ? products
        .filter((p) => productoEsRelacionado(p, perfil, categories))
        .sort((a, b) => rankScoreParaVos(b, perfil.scores, viewed) - rankScoreParaVos(a, perfil.scores, viewed))
      : []

    const likedIds = new Set(likedProducts.map((p) => String(p.id)))
    return [
      ...likedProducts,
      ...ranked.filter((p) => !likedIds.has(String(p.id))),
    ]
  }, [products, perfil, categories, likedProducts])

  const negocios = useMemo(
    () => negociosDesdeLikes(likedProducts.length > 0 ? likedProducts : relacionados),
    [likedProducts, relacionados],
  )

  const avanzarORevelar = useCallback((nextLikes: number, nextSwipes: number, nextIndice: number) => {
    const restantes = deck.length - nextIndice
    if (debeRevelar(nextLikes, nextSwipes, restantes <= 0)) {
      setFase('revelando')
      return
    }
    setIndice(nextIndice)
  }, [deck.length])

  const handleLike = useCallback((producto: Producto) => {
    aplicarLikeProducto(producto)
    refreshLocal()
    if (producto.id != null && !isLiked(producto.id as Id)) {
      toggleWishlist(producto)
    }
    analytics.descubriLike(producto.id)
    setLikedProducts((prev) => {
      if (prev.some((p) => p.id === producto.id)) return prev
      return [...prev, producto]
    })
    const nextLikes = likes + 1
    const nextSwipes = swipes + 1
    setLikes(nextLikes)
    setSwipes(nextSwipes)
    avanzarORevelar(nextLikes, nextSwipes, indice + 1)
  }, [avanzarORevelar, indice, isLiked, likes, refreshLocal, swipes, toggleWishlist])

  const handleSkip = useCallback((producto: Producto) => {
    marcarProductoVisto(producto.id)
    refreshLocal()
    analytics.descubriDescarte(producto.id)
    const nextSwipes = swipes + 1
    setSwipes(nextSwipes)
    avanzarORevelar(likes, nextSwipes, indice + 1)
  }, [avanzarORevelar, indice, likes, refreshLocal, swipes])

  const handleRevelacionDone = useCallback(() => {
    if (!revelacionTracked.current) {
      revelacionTracked.current = true
      analytics.descubriRevelacion(likes, negocios.length)
    }
    setFase('resultados')
  }, [likes, negocios.length])

  const handleSeguirDescubriendo = useCallback(() => {
    revelacionTracked.current = false
    armarMazo(products)
  }, [armarMazo, products])

  return (
    <MainLayout>
      <Seo
        title={t('descubri.metaTitle')}
        description={t('descubri.metaDescription')}
        url="https://hotclick.lat/descubri"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-10 sm:pt-8">
        <DescubriHeader
          subtitle={fase === 'mazo' ? t('descubri.deckTitle') : undefined}
        />
        {status === 'loading' && <DescubriLoading />}
        {status === 'error' && <DescubriError onRetry={load} />}
        {status === 'ready' && fase === 'mazo' && deck.length === 0 && (
          <DescubriResultados
            products={relacionados}
            negocios={negocios}
            onSeguirDescubriendo={handleSeguirDescubriendo}
          />
        )}
        {status === 'ready' && fase === 'mazo' && deck.length > 0 && (
          <DescubriMazo
            productos={deck}
            indice={indice}
            likes={likes}
            onLike={handleLike}
            onSkip={handleSkip}
          />
        )}
        {status === 'ready' && fase === 'revelando' && (
          <DescubriRevelacion onDone={handleRevelacionDone} />
        )}
        {status === 'ready' && fase === 'resultados' && (
          <DescubriResultados
            products={relacionados}
            negocios={negocios}
            onSeguirDescubriendo={handleSeguirDescubriendo}
          />
        )}
      </div>
    </MainLayout>
  )
}

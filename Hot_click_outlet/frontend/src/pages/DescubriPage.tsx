import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import { analytics } from '@/utils/analytics'
import {
  hasGustos,
  loadGustos,
  saveGustosSeleccion,
  rankScoreParaVos,
  loadRecentlyViewedIds,
  productoEsRelacionado,
  type PriceBandId,
  type GustosPerfil,
} from '@/utils/gustos'
import { buildCategoryTree } from '@/pages/catalogo/catalogoHelpers'
import type { CatalogCategoria } from '@/pages/catalogo/catalogoTipos'
import type { Producto, ProductoBackend } from '@/types/producto'
import type { Id, Pagina } from '@/types/api'
import DescubriHeader from './descubri/DescubriHeader'
import DescubriLoading from './descubri/DescubriLoading'
import DescubriError from './descubri/DescubriError'
import DescubriChips from './descubri/DescubriChips'
import DescubriResultados from './descubri/DescubriResultados'

type Fase = 'chips' | 'resultados'
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

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

function toggleBand(ids: PriceBandId[], id: PriceBandId): PriceBandId[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

export default function DescubriPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('loading')
  const [fase, setFase] = useState<Fase>(() => (hasGustos() ? 'resultados' : 'chips'))
  const [categories, setCategories] = useState<CatalogCategoria[]>([])
  const [products, setProducts] = useState<Producto[]>([])
  const [perfil, setPerfil] = useState<GustosPerfil>(() => loadGustos())
  const [selectedCats, setSelectedCats] = useState<string[]>(
    () => loadGustos().selectedCategoryIds,
  )
  const [selectedBands, setSelectedBands] = useState<PriceBandId[]>(
    () => loadGustos().selectedPriceBands,
  )
  const chipsViewed = useRef(false)
  const resultsViewed = useRef(false)

  const load = useCallback(() => {
    setStatus('loading')
    productService.getCategories()
      .then((catsRes) => {
        setCategories(normalizarCategorias(catsRes.data))
        setStatus('ready')
      })
      .catch(() => setStatus('error'))

    productService.getAll(0, 100)
      .then((prodRes) => setProducts(listaProductos(prodRes.data)))
      .catch(() => setProducts([]))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (status !== 'ready') return
    if (fase === 'chips' && !chipsViewed.current) {
      chipsViewed.current = true
      analytics.descubriChipsView()
    }
    if (fase === 'resultados' && !resultsViewed.current) {
      resultsViewed.current = true
      analytics.descubriResultsView(perfil.selectedCategoryIds.length)
    }
  }, [status, fase, perfil.selectedCategoryIds.length])

  const roots = useMemo(
    () => buildCategoryTree(categories).filter((c) => c.id != null && String(c.id) !== ''),
    [categories],
  )

  const relacionados = useMemo(() => {
    if (!hasGustos(perfil)) return []
    const viewed = loadRecentlyViewedIds()
    return products
      .filter((p) => productoEsRelacionado(p, perfil, categories))
      .sort((a, b) => rankScoreParaVos(b, perfil.scores, viewed) - rankScoreParaVos(a, perfil.scores, viewed))
  }, [products, perfil, categories])

  const handleSave = () => {
    if (selectedCats.length === 0) return
    saveGustosSeleccion(selectedCats, selectedBands)
    const next = loadGustos()
    setPerfil(next)
    analytics.descubriChipsSave(selectedCats.length, selectedBands.length)
    resultsViewed.current = false
    setFase('resultados')
  }

  const handleChangeGustos = () => {
    chipsViewed.current = false
    setSelectedCats(perfil.selectedCategoryIds)
    setSelectedBands(perfil.selectedPriceBands)
    setFase('chips')
  }

  return (
    <MainLayout>
      <Helmet>
        <title>{t('descubri.metaTitle')}</title>
        <meta name="description" content={t('descubri.metaDescription')} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-10 sm:pt-8">
        <DescubriHeader
          subtitle={fase === 'chips' ? t('descubri.chipsTitle') : undefined}
        />
        {status === 'loading' && <DescubriLoading />}
        {status === 'error' && <DescubriError onRetry={load} />}
        {status === 'ready' && fase === 'chips' && (
          <DescubriChips
            roots={roots}
            selectedCats={selectedCats}
            selectedBands={selectedBands}
            onToggleCat={(id) => setSelectedCats((s) => toggleId(s, id))}
            onToggleBand={(id) => setSelectedBands((s) => toggleBand(s, id))}
            onSave={handleSave}
          />
        )}
        {status === 'ready' && fase === 'resultados' && (
          <DescubriResultados
            products={relacionados}
            onChangeGustos={handleChangeGustos}
          />
        )}
      </div>
    </MainLayout>
  )
}

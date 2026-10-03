import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Seo from '@/components/seo/Seo'
import Chip from '@/components/comprador/Chip'
import CategoryTile from '@/components/comprador/CategoryTile'
import IconoFigma from '@/components/comprador/IconoFigma'
import { useCategoriasCatalogo } from '@/components/comprador/useCategoriasCatalogo'
import useChatStore from '@/store/chatStore'
import { ICONOS_CATALOGO } from '@/pages/catalogo/iconosCatalogo'
import { CLASE_GRILLA_TARJETAS } from '@/pages/catalogo/catalogoGrilla'
import { PLANES_DIRECTORIO, rutaDirectorioPlan } from '@/components/comprador/negocios/negociosPublicos'
import { filtrarCategorias } from './categoriasFiltro'

/**
 * Pestaña Categorías (Figma `43:1454`): barra propia con título y buscador, chip "No sé qué busco" que abre
 * el asistente y categorías reales con foto y cantidad; cada una abre el catálogo filtrado.
 * Si lo escrito no coincide con ninguna categoría, Enter lo busca como producto en el catálogo.
 */
export default function CategoriasPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { categorias, cargando } = useCategoriasCatalogo()
  const [texto, setTexto] = useState('')
  const visibles = useMemo(() => filtrarCategorias(categorias, texto), [categorias, texto])

  const alBuscar = (e: FormEvent) => {
    e.preventDefault()
    const consulta = texto.trim()
    if (consulta && visibles.length === 0) navigate(`/productos?search=${encodeURIComponent(consulta)}`)
  }

  return (
    <MainLayout variante="propia">
      <Seo title={t('products.categoriesTitle')} description={t('products.categoriesSub')} url="https://hotclick.lat/categorias" />
      <div className="mx-auto flex w-full max-w-5xl flex-col lg:max-w-none lg:px-8 lg:pt-6 xl:px-[max(120px,calc((100%_-_1200px)/2))]">
        <form
          onSubmit={alBuscar}
          className="flex flex-col gap-3 rounded-b-[14px] border-b border-hc-n-200 bg-hc-n-0 px-4 py-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0"
        >
          <h1 className="font-display text-[20px] font-bold leading-[normal] text-hc-n-900">{t('products.categoriesTitle')}</h1>
          <label className="flex items-center gap-[10px] rounded-[12px] bg-hc-n-100 px-[14px] py-3 lg:max-w-[560px]">
            <IconoFigma src={ICONOS_CATALOGO.lupa18} size={18} className="shrink-0 text-hc-n-500" />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t('products.categoriesSearch')}
              aria-label={t('products.categoriesSearch')}
              className="hc-input-libre min-w-0 flex-1 bg-transparent text-[14px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
            />
          </label>
        </form>

        <div className="flex flex-col gap-[14px] p-4 lg:px-0">
          <div className="flex items-center">
            <Chip variante="asistente" texto={t('products.categoriesAssistant')} onClick={() => useChatStore.getState().open(null)} />
          </div>
          <nav aria-label={t('negocios.navAria')} className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold leading-[normal] text-hc-n-600">{t('negocios.navAria')}</h2>
            <div className="flex flex-wrap gap-2">
              {PLANES_DIRECTORIO.map((p) => <Chip key={p.alias} texto={t(p.nav)} to={rutaDirectorioPlan(p.alias)} />)}
            </div>
          </nav>
          {cargando && <p className="text-[14px] text-hc-n-600">{t('products.loading')}</p>}
          {!cargando && visibles.length === 0 && (
            <p className="text-[14px] text-hc-n-600">{t('products.categoriesEmpty')}</p>
          )}
          <div className={`${CLASE_GRILLA_TARJETAS} lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]`}>
            {visibles.map((c) => (
              <CategoryTile key={c.id} nombre={c.nombre} cantidad={c.cantidad} fotoUrl={c.fotoUrl} to={`/productos?cat=${c.id}`} className="w-[167px] lg:w-full" />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

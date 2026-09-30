import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Seo from '@/components/seo/Seo'
import CategoryTile from '@/components/comprador/CategoryTile'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { useCategoriasCatalogo } from '@/components/comprador/useCategoriasCatalogo'
import { filtrarCategorias } from './categoriasFiltro'

/** Pestaña Categorías (Figma `43:1454`): categorías reales con foto y cantidad; cada una abre el catálogo filtrado. */
export default function CategoriasPage() {
  const { t } = useTranslation()
  const { categorias, cargando } = useCategoriasCatalogo()
  const [texto, setTexto] = useState('')
  const visibles = useMemo(() => filtrarCategorias(categorias, texto), [categorias, texto])

  return (
    <MainLayout>
      <Seo title={t('products.categoriesTitle')} description={t('products.categoriesSub')} url="https://hotclick.lat/categorias" />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-8 pt-4">
        <h1 className="font-display text-[22px] font-bold text-hc-n-900">{t('products.categoriesTitle')}</h1>
        <label className="flex items-center gap-[10px] rounded-[12px] bg-hc-n-100 px-[14px] py-3">
          <IconoFigma src={ICONOS_COMPRADOR.buscador} size={18} className="text-hc-n-600" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t('products.categoriesSearch')}
            aria-label={t('products.categoriesSearch')}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
          />
        </label>
        {cargando && <p className="text-[14px] text-hc-n-500">{t('products.loading')}</p>}
        {!cargando && visibles.length === 0 && (
          <p className="text-[14px] text-hc-n-600">{t('products.categoriesEmpty')}</p>
        )}
        <div className="grid grid-cols-2 gap-x-3 gap-y-[18px] sm:grid-cols-3 lg:grid-cols-4">
          {visibles.map((c) => (
            <CategoryTile key={c.id} nombre={c.nombre} cantidad={c.cantidad} fotoUrl={c.fotoUrl} to={`/productos?cat=${c.id}`} />
          ))}
        </div>
      </div>
    </MainLayout>
  )
}

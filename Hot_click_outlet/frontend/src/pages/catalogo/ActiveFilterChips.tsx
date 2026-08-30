import { COND_OPTIONS, STOCK_OPTIONS } from './catalogoFiltros'
import { useTranslation } from 'react-i18next'
import CloseIcon from '@/components/ui/CloseIcon'
import type { CatalogMarca } from './catalogoTipos'
import type { TFunction } from 'i18next'

type ChipActivo = {
  key: string
  label: string | undefined
  clear: () => void
}

function chipsActivos({
  marcas, marcasFilter, toggleMarca,
  filterCond, setFilterCond,
  filterStock, setFilterStock,
  filterTalla, setFilterTalla,
  priceMin, priceMax, setPriceMin, setPriceMax,
  t,
}: {
  marcas: CatalogMarca[]
  marcasFilter: Set<string>
  toggleMarca: (id: string) => void
  filterCond: string
  setFilterCond: (v: string) => void
  filterStock: string
  setFilterStock: (v: string) => void
  filterTalla: string
  setFilterTalla: (v: string) => void
  priceMin: string
  priceMax: string
  setPriceMin: (v: string) => void
  setPriceMax: (v: string) => void
  t: TFunction
}): ChipActivo[] {
  const condKey = COND_OPTIONS.find(o => o.value === filterCond)?.labelKey
  const stockKey = STOCK_OPTIONS.find(o => o.value === filterStock)?.labelKey
  return [
    ...([...marcasFilter].map(id => ({
      key: `m-${id}`,
      label: marcas.find(m => String(m.id) === id)?.nombreMarca ?? t('products.brand'),
      clear: () => toggleMarca(id),
    }))),
    filterCond   && { key: 'cond',  label: condKey ? t(condKey) : undefined,  clear: () => setFilterCond('') },
    filterStock  && { key: 'stock', label: stockKey ? t(stockKey) : undefined, clear: () => setFilterStock('') },
    filterTalla  && { key: 'talla', label: t('products.sizeChip', { talla: filterTalla }), clear: () => setFilterTalla('') },
    (priceMin || priceMax) && {
      key: 'price',
      label: etiquetaRangoPrecio(priceMin, priceMax),
      clear: () => { setPriceMin(''); setPriceMax('') },
    },
  ].filter((chip): chip is ChipActivo => Boolean(chip))
}

export default function ActiveFilterChips({
  marcas, marcasFilter, toggleMarca,
  filterCond, setFilterCond,
  filterStock, setFilterStock,
  filterTalla, setFilterTalla,
  priceMin, priceMax, setPriceMin, setPriceMax,
  clearFilters,
}: {
  marcas: CatalogMarca[]
  marcasFilter: Set<string>
  toggleMarca: (id: string) => void
  filterCond: string
  setFilterCond: (v: string) => void
  filterStock: string
  setFilterStock: (v: string) => void
  filterTalla: string
  setFilterTalla: (v: string) => void
  priceMin: string
  priceMax: string
  setPriceMin: (v: string) => void
  setPriceMax: (v: string) => void
  clearFilters: () => void
}) {
  const { t } = useTranslation()
  const chips = chipsActivos({
    marcas, marcasFilter, toggleMarca,
    filterCond, setFilterCond,
    filterStock, setFilterStock,
    filterTalla, setFilterTalla,
    priceMin, priceMax, setPriceMin, setPriceMax,
    t,
  })
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(chip => (
        <button type="button" key={chip.key} onClick={chip.clear}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
          style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)', borderColor: 'color-mix(in srgb, var(--hc-accent) 25%, transparent)' }}>
          {chip.label}
          <CloseIcon className="w-3 h-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={clearFilters} className="text-xs hover:opacity-70 transition-opacity underline" style={{ color: 'var(--hc-muted)' }}>
          {t('products.clearAll')}
        </button>
      )}
    </div>
  )
}

function etiquetaRangoPrecio(priceMin: string, priceMax: string) {
  if (priceMin && priceMax) {
    return `₡${Number(priceMin).toLocaleString()} – ₡${Number(priceMax).toLocaleString()}`
  }
  if (priceMin) return `> ₡${Number(priceMin).toLocaleString()}`
  return `< ₡${Number(priceMax).toLocaleString()}`
}

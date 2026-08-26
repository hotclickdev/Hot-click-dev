import { COND_OPTIONS, STOCK_OPTIONS } from './catalogoFiltros'
import CloseIcon from '@/components/ui/CloseIcon'

function chipsActivos({
  marcas, marcasFilter, toggleMarca,
  filterCond, setFilterCond,
  filterStock, setFilterStock,
  filterTalla, setFilterTalla,
  priceMin, priceMax, setPriceMin, setPriceMax,
}) {
  return [
    ...([...marcasFilter].map(id => ({
      key: `m-${id}`,
      label: marcas.find(m => String(m.id) === id)?.nombreMarca ?? 'Marca',
      clear: () => toggleMarca(id),
    }))),
    filterCond   && { key: 'cond',  label: COND_OPTIONS.find(o => o.value === filterCond)?.label,  clear: () => setFilterCond('') },
    filterStock  && { key: 'stock', label: STOCK_OPTIONS.find(o => o.value === filterStock)?.label, clear: () => setFilterStock('') },
    filterTalla  && { key: 'talla', label: `Talla ${filterTalla}`, clear: () => setFilterTalla('') },
    (priceMin || priceMax) && {
      key: 'price',
      label: etiquetaRangoPrecio(priceMin, priceMax),
      clear: () => { setPriceMin(''); setPriceMax('') },
    },
  ].filter(Boolean)
}

export default function ActiveFilterChips({
  marcas, marcasFilter, toggleMarca,
  filterCond, setFilterCond,
  filterStock, setFilterStock,
  filterTalla, setFilterTalla,
  priceMin, priceMax, setPriceMin, setPriceMax,
  clearFilters,
}) {
  const chips = chipsActivos({
    marcas, marcasFilter, toggleMarca,
    filterCond, setFilterCond,
    filterStock, setFilterStock,
    filterTalla, setFilterTalla,
    priceMin, priceMax, setPriceMin, setPriceMax,
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
          Limpiar todo
        </button>
      )}
    </div>
  )
}

function etiquetaRangoPrecio(priceMin, priceMax) {
  if (priceMin && priceMax) {
    return `₡${Number(priceMin).toLocaleString()} – ₡${Number(priceMax).toLocaleString()}`
  }
  if (priceMin) return `> ₡${Number(priceMin).toLocaleString()}`
  return `< ₡${Number(priceMax).toLocaleString()}`
}

import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { FiltrosExtra, TiendaCatalogo } from './buscarExplorar'
import type { CatalogCategoria, CatalogCounts } from './catalogoTipos'

type FiltrosPanelProps = {
  priceMin: string
  priceMax: string
  setPriceMin: (v: string) => void
  setPriceMax: (v: string) => void
  categories: CatalogCategoria[]
  categoryTotalCount: CatalogCounts
  category: string
  setCategory: (v: string) => void
  tiendas: TiendaCatalogo[]
  extras: FiltrosExtra
  setExtras: (updater: (prev: FiltrosExtra) => FiltrosExtra) => void
  soloConStock: boolean
  setSoloConStock: (v: boolean) => void
  hayRetiro: boolean
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-[10px] border-t border-hc-n-200 py-[14px] first:border-t-0">
      <legend className="float-left mb-[10px] w-full text-[14px] font-semibold text-hc-n-900">{titulo}</legend>
      {children}
    </fieldset>
  )
}

function CampoPrecio({ etiqueta, valor, onCambiar }: { etiqueta: string; valor: string; onCambiar: (v: string) => void }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex flex-1 flex-col gap-[2px] rounded-[10px] border border-hc-n-200 bg-hc-n-0 px-3 py-2">
      <span className="text-[11px] text-hc-n-500">{etiqueta}</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="₡0"
        className="w-full bg-transparent font-display text-[14px] font-semibold text-hc-n-900 outline-none"
      />
    </label>
  )
}

function Interruptor({ etiqueta, activo, onCambiar }: { etiqueta: string; activo: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-[10px] text-[14px] text-hc-n-900">
      {etiqueta}
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onCambiar(!activo)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${activo ? 'bg-hc-blue-600' : 'bg-hc-n-200'}`}
      >
        <span className={`absolute top-[3px] size-[18px] rounded-full bg-hc-n-0 transition-[left] ${activo ? 'left-[19px]' : 'left-[3px]'}`} />
      </button>
    </label>
  )
}

/** Filtros del catálogo (Figma `26:887`): precio, categoría, tienda y disponibilidad. Se usa en la hoja móvil y en el lateral de desktop. */
export default function FiltrosPanel({
  priceMin, priceMax, setPriceMin, setPriceMax,
  categories, categoryTotalCount, category, setCategory,
  tiendas, extras, setExtras, soloConStock, setSoloConStock, hayRetiro,
}: FiltrosPanelProps) {
  const { t } = useTranslation()
  const raices = categories.filter((c) => (categoryTotalCount[String(c.id)] ?? 0) > 0 && !c.padreId)

  const alternarTienda = (nombre: string) => setExtras((prev) => {
    const tiendasNuevas = new Set(prev.tiendas)
    if (tiendasNuevas.has(nombre)) tiendasNuevas.delete(nombre)
    else tiendasNuevas.add(nombre)
    return { ...prev, tiendas: tiendasNuevas }
  })

  return (
    <div className="flex flex-col">
      <Grupo titulo={t('products.price')}>
        <div className="flex gap-[10px]">
          <CampoPrecio etiqueta={t('products.priceMin')} valor={priceMin} onCambiar={setPriceMin} />
          <CampoPrecio etiqueta={t('products.priceMax')} valor={priceMax} onCambiar={setPriceMax} />
        </div>
      </Grupo>

      {raices.length > 0 && (
        <Grupo titulo={t('products.categoryLabel')}>
          <div className="flex flex-wrap gap-2">
            {raices.map((c) => {
              const activo = String(c.id) === String(category)
              return (
                <button
                  key={String(c.id)}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setCategory(activo ? '' : String(c.id))}
                  className={`rounded-full border px-[14px] py-2 text-[13px] font-medium ${activo ? 'border-hc-blue-600 bg-hc-blue-600 text-hc-n-0' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'}`}
                >
                  {c.nombreCategoria ?? c.nombre}
                </button>
              )
            })}
          </div>
        </Grupo>
      )}

      {tiendas.length > 0 && (
        <Grupo titulo={t('products.store')}>
          {tiendas.map((tienda) => (
            <label key={tienda.nombre} className="flex items-center gap-[10px] text-[14px] text-hc-n-900">
              <input
                type="checkbox"
                checked={extras.tiendas.has(tienda.nombre)}
                onChange={() => alternarTienda(tienda.nombre)}
                className="size-5 accent-[var(--hc-blue-600)]"
              />
              <span className="flex-1">{tienda.nombre}</span>
              <span className="text-[13px] text-hc-n-500">{tienda.cantidad}</span>
            </label>
          ))}
        </Grupo>
      )}

      <Grupo titulo={t('products.availabilityDelivery')}>
        <Interruptor etiqueta={t('products.onlyInStock')} activo={soloConStock} onCambiar={setSoloConStock} />
        <Interruptor etiqueta={t('products.madeToOrder')} activo={extras.hechoAPedido} onCambiar={(v) => setExtras((prev) => ({ ...prev, hechoAPedido: v }))} />
        {hayRetiro && (
          <Interruptor etiqueta={t('products.storePickup')} activo={extras.retiroEnTienda} onCambiar={(v) => setExtras((prev) => ({ ...prev, retiroEnTienda: v }))} />
        )}
      </Grupo>
    </div>
  )
}

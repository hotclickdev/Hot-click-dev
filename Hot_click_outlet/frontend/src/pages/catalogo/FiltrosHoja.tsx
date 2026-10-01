import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Casilla from './Casilla'
import RangoPrecio from './RangoPrecio'
import type { FiltrosPanelProps } from './FiltrosPanel'

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-[10px] border-t border-hc-n-200 px-4 py-[14px]">
      <legend className="float-left w-full text-[14px] font-semibold leading-[normal] text-hc-n-900">{titulo}</legend>
      {children}
    </fieldset>
  )
}

function CampoPrecio({ etiqueta, valor, onCambiar }: { etiqueta: string; valor: string; onCambiar: (v: string) => void }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-[2px] rounded-[10px] border border-hc-n-200 bg-hc-n-0 px-3 py-2">
      <span className="text-[11px] leading-[normal] text-hc-n-500">{etiqueta}</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="₡0"
        className="hc-input-libre w-full bg-transparent font-display text-[14px] font-semibold leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-900"
      />
    </label>
  )
}

function Interruptor({ etiqueta, activo, onCambiar }: { etiqueta: string; activo: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-[10px] text-[14px] leading-[normal] text-hc-n-900">
      <span className="min-w-0 flex-1">{etiqueta}</span>
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

/** Contenido de la hoja de filtros móvil (Figma `26:888`): precio con rango, categoría, tienda y disponibilidad. */
export default function FiltrosHoja({
  priceMin, priceMax, setPriceMin, setPriceMax, precioTope,
  categories, categoryTotalCount, category, setCategory,
  tiendas, extras, setExtras, soloConStock, setSoloConStock, hayRetiro,
}: FiltrosPanelProps) {
  const { t } = useTranslation()
  const raices = categories.filter((c) => (categoryTotalCount[String(c.id)] ?? 0) > 0 && !c.padreId)

  const alternarTienda = (nombre: string) => setExtras((prev) => {
    const nuevas = new Set(prev.tiendas)
    if (nuevas.has(nombre)) nuevas.delete(nombre)
    else nuevas.add(nombre)
    return { ...prev, tiendas: nuevas }
  })

  return (
    <div className="flex flex-col">
      <Grupo titulo={t('products.priceShort')}>
        <div className="flex gap-[10px]">
          <CampoPrecio etiqueta={t('products.priceMin')} valor={priceMin} onCambiar={setPriceMin} />
          <CampoPrecio etiqueta={t('products.priceMax')} valor={priceMax} onCambiar={setPriceMax} />
        </div>
        <RangoPrecio tope={precioTope ?? 0} priceMin={priceMin} priceMax={priceMax} setPriceMin={setPriceMin} setPriceMax={setPriceMax} />
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
                  className={`rounded-full border px-[14px] py-2 text-[13px] font-medium leading-[normal] ${activo ? 'border-hc-blue-600 bg-hc-blue-600 text-hc-n-0' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'}`}
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
            <Casilla
              key={tienda.nombre}
              tamano="hoja"
              etiqueta={tienda.nombre}
              marcada={extras.tiendas.has(tienda.nombre)}
              onCambiar={() => alternarTienda(tienda.nombre)}
              cuenta={tienda.cantidad}
            />
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

import { useTranslation } from 'react-i18next'
import CatIcon from '@/pages/catalogo/CatIcon'
import { formatPrice } from '@/utils/format'
import { PRICE_BANDS, type PriceBandId } from '@/utils/gustos'
import type { CatalogCategoriaNodo } from '@/pages/catalogo/catalogoTipos'

type DescubriChipsProps = {
  roots: CatalogCategoriaNodo[]
  selectedCats: string[]
  selectedBands: PriceBandId[]
  onToggleCat: (id: string) => void
  onToggleBand: (id: PriceBandId) => void
  onSave: () => void
}

function labelBanda(id: PriceBandId, t: (k: string, o?: Record<string, string>) => string): string {
  if (id === 'b1') return t('descubri.bandUnder', { amount: formatPrice(10000) })
  if (id === 'b2') return t('descubri.bandRange', { min: formatPrice(10000), max: formatPrice(25000) })
  if (id === 'b3') return t('descubri.bandRange', { min: formatPrice(25000), max: formatPrice(50000) })
  return t('descubri.bandOver', { amount: formatPrice(50000) })
}

/** Pantalla rápida: elegir categorías (obligatorio) y presupuesto (opcional). */
export default function DescubriChips({
  roots,
  selectedCats,
  selectedBands,
  onToggleCat,
  onToggleBand,
  onSave,
}: DescubriChipsProps) {
  const { t } = useTranslation()
  const canSave = selectedCats.length > 0
  const selectedCatSet = new Set(selectedCats)
  const selectedBandSet = new Set(selectedBands)

  return (
    <div className="max-w-lg mx-auto">
      <p className="text-sm mb-5" style={{ color: 'var(--hc-muted)' }}>
        {t('descubri.chipsSub')}
      </p>

      <h2 className="text-sm font-semibold mb-2.5" style={{ color: 'var(--hc-text)' }}>
        {t('descubri.chipsCategories')}
      </h2>
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label={t('descubri.chipsCategories')}>
        {roots.map((cat) => {
          const id = String(cat.id)
          const nombre = cat.nombreCategoria ?? cat.nombre ?? id
          const pressed = selectedCatSet.has(id)
          return (
            <button
              key={id}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggleCat(id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-11"
              style={{
                background: pressed ? 'var(--hc-accent)' : 'var(--hc-surface)',
                color: pressed ? '#fff' : 'var(--hc-text)',
                border: `1px solid ${pressed ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
              }}
            >
              <CatIcon name={nombre} className="w-4 h-4 shrink-0" />
              {nombre}
            </button>
          )
        })}
      </div>

      <h2 className="text-sm font-semibold mb-2.5" style={{ color: 'var(--hc-text)' }}>
        {t('descubri.chipsBudget')}
        <span className="font-normal ml-1" style={{ color: 'var(--hc-muted)' }}>
          {t('descubri.chipsOptional')}
        </span>
      </h2>
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label={t('descubri.chipsBudget')}>
        {PRICE_BANDS.map(({ id }) => {
          const pressed = selectedBandSet.has(id)
          return (
            <button
              key={id}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggleBand(id)}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-11"
              style={{
                background: pressed ? 'var(--hc-accent)' : 'var(--hc-surface)',
                color: pressed ? '#fff' : 'var(--hc-text)',
                border: `1px solid ${pressed ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
              }}
            >
              {labelBanda(id, t)}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={onSave}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        style={{ background: 'var(--hc-accent)' }}
      >
        {t('descubri.chipsCta')}
      </button>
      {!canSave && (
        <p className="text-xs text-center mt-2" style={{ color: 'var(--hc-muted)' }}>
          {t('descubri.chipsNeedCategory')}
        </p>
      )}
    </div>
  )
}

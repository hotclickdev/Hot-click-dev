import { Link } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { conditionLabel, conditionVariant } from '@/utils/format'
import type { TFunction } from 'i18next'
import type { NavigateFunction } from 'react-router-dom'
import type { Producto } from '@/types/producto'
import type { BadgeProps } from '@/components/ui/Badge'
import ColorSwatches from './ColorSwatches'
import SizeSelector from './SizeSelector'
import type { VarianteProducto } from './productoHelpers'

type TitleAndBadgesProps = {
  product: Producto
  variantes: VarianteProducto[]
  tallaSeleccionada: string | null
  onSelectTalla: (talla: string) => void
  stockBadge: NonNullable<BadgeProps['variant']>
  stockLabel: string
  onNavigate: NavigateFunction
  t: TFunction
}

function varianteCondicion(cond: string): NonNullable<BadgeProps['variant']> {
  const variante = conditionVariant(cond)
  if (variante === 'success' || variante === 'accent' || variante === 'warning' || variante === 'default'
    || variante === 'danger' || variante === 'purple') {
    return variante
  }
  return 'default'
}

export default function TitleAndBadges({
  product, variantes, tallaSeleccionada, onSelectTalla, stockBadge, stockLabel, onNavigate, t,
}: TitleAndBadgesProps) {
  const marcaHref = `/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {product.marcaNombre && (
          <button
            type="button"
            onClick={() => onNavigate(marcaHref)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
            style={{ background: 'rgba(140,92,246,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(140,92,246,0.25)' }}
          >
            {product.marcaLogoUrl && (
              <img src={product.marcaLogoUrl} alt="" className="w-4 h-4 object-contain rounded-sm" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
            {product.marcaNombre}
          </button>
        )}
        {product.condicion && (
          <Badge variant={varianteCondicion(product.condicion)}>
            {conditionLabel(product.condicion)}
          </Badge>
        )}
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-hc-text leading-tight">
        {product.titulo || product.nombre}
      </h1>
      {product.titulo && product.titulo !== product.nombre && (
        <p className="text-sm text-hc-muted">{product.nombre}</p>
      )}
      <VendidoPor product={product} t={t} />
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={stockBadge}>{stockLabel}</Badge>
      </div>
      <ColorSwatches product={product} variantes={variantes} onNavigate={onNavigate} t={t} />
      <SizeSelector
        product={product}
        variantes={variantes}
        tallaSeleccionada={tallaSeleccionada}
        onSelectTalla={onSelectTalla}
        onNavigate={onNavigate}
        t={t}
      />
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
        <TrustGlyph tipo="check" className="w-3.5 h-3.5" />
        {t('socialProof.warranty')}
      </span>
    </div>
  )
}

function VendidoPor({ product, t }: { product: Producto; t: TFunction }) {
  if (!product.empresaNombre) return null
  if (product.empresaSlug) {
    return (
      <p className="text-sm text-hc-muted">
        {t('product.vendidoPor')}{' '}
        <Link
          to={`/tienda/${product.empresaSlug}`}
          className="font-medium text-hc-accent hover:underline"
        >
          {product.empresaNombre}
        </Link>
      </p>
    )
  }
  return (
    <p className="text-sm text-hc-muted">
      {t('product.vendidoPor')} <span className="font-medium text-hc-accent">{product.empresaNombre}</span>
    </p>
  )
}

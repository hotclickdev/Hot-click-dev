import Badge from '@/components/ui/Badge'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { conditionLabel, conditionVariant } from '@/utils/format'
import ColorSwatches from './ColorSwatches'
import SizeSelector from './SizeSelector'

/**
 * Marca, título, stock, colores y tallas de la ficha.
 */
export default function TitleAndBadges({ product, variantes, tallaSeleccionada, onSelectTalla, stockBadge, stockLabel, onNavigate, t }) {
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
              <img src={product.marcaLogoUrl} alt="" className="w-4 h-4 object-contain rounded-sm" onError={(e) => { e.target.style.display = 'none' }} />
            )}
            {product.marcaNombre}
          </button>
        )}
        {product.condicion && (
          <Badge variant={conditionVariant(product.condicion)}>
            {conditionLabel(product.condicion)}
          </Badge>
        )}
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#e8e8ed] leading-tight">
        {product.titulo || product.nombre}
      </h1>
      {product.titulo && product.titulo !== product.nombre && (
        <p className="text-sm text-[#8e8e9a]">{product.nombre}</p>
      )}
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

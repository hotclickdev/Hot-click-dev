import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Badge from '@/components/ui/Badge'
import SocialProof from '@/components/ui/SocialProof'
import useWishlistStore from '@/store/wishlistStore'
import { detectarColor } from '@/utils/colorDetector'
import { formatPrice, conditionLabel, conditionVariant } from '@/utils/format'
import HeartDetailIcon from './HeartDetailIcon'
import TrustBadges from './TrustBadges'
import { stockDesdeProducto, tallasDesdeProducto } from './productoHelpers'

function ColorSwatches({ product, variantes, onNavigate, t }) {
  if (!(product.colorVariante || variantes.some((v) => v.colorVariante))) return null
  const hexActual = (product.colorVariante && detectarColor(product.colorVariante).hex) || '#3a3a42'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-[#8e8e9a]">{t('product.otherColors', 'Otros colores')}:</span>
      <button type="button" onClick={() => {}} disabled
        className="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-offset-[#0d0d12] ring-[#e8e8ed] shrink-0"
        style={{ backgroundColor: hexActual }}
        title={product.colorVariante || product.nombre} />
      {variantes.filter((v) => v.colorVariante).map((v) => {
        const hex = (v.colorVariante && detectarColor(v.colorVariante).hex) || '#3a3a42'
        return (
          <button key={v.id} type="button" onClick={() => onNavigate(`/productos/${v.id}`)}
            className="w-7 h-7 rounded-full border border-white/20 shrink-0 hover:scale-110 transition-transform"
            style={{ backgroundColor: hex }}
            title={v.colorVariante || v.nombreProducto} />
        )
      })}
    </div>
  )
}

function SizeSelector({ product, variantes, tallaSeleccionada, onSelectTalla, onNavigate, t }) {
  const { tallasPropias, hermanasPorTalla } = tallasDesdeProducto(product, variantes)
  if (tallasPropias.length === 0 && hermanasPorTalla.size === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-[#8e8e9a]">{t('product.size', 'Talla')}:</span>
      {tallasPropias.map((tOpt) => (
        <button key={tOpt} type="button" onClick={() => onSelectTalla(tOpt)}
          className="min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors"
          style={tallaSeleccionada === tOpt
            ? { backgroundColor: '#e8e8ed', color: '#0d0d12', borderColor: '#e8e8ed' }
            : { backgroundColor: 'transparent', color: '#e8e8ed', borderColor: 'rgba(255,255,255,0.2)' }}>
          {tOpt}
        </button>
      ))}
      {[...hermanasPorTalla.entries()].map(([tOpt, v]) => (
        <button key={v.id} type="button" onClick={() => onNavigate(`/productos/${v.id}`)}
          className="min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors"
          style={{ backgroundColor: 'transparent', color: '#e8e8ed', borderColor: 'rgba(255,255,255,0.2)' }}>
          {tOpt}
        </button>
      ))}
    </div>
  )
}

function QuantitySelector({ quantity, stock, atMax, onDecrease, onIncrease, t }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-[#8e8e9a] shrink-0">{t('product.quantity')}</span>

      <div className="flex items-center rounded-2xl border border-white/12 bg-white/4 overflow-hidden">
        <motion.button
          onClick={onDecrease}
          disabled={quantity <= 1}
          whileTap={{ scale: 0.85 }}
          className="w-12 h-12 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors select-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M5 12h14" />
          </svg>
        </motion.button>

        <div className="w-12 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={quantity}
              initial={{ opacity: 0, y: -12, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.7 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="text-base font-bold text-[#e8e8ed] select-none"
            >
              {quantity}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.button
          onClick={onIncrease}
          disabled={atMax}
          whileTap={atMax ? { x: [0, 4, -4, 4, 0] } : { scale: 0.85 }}
          transition={{ duration: 0.3 }}
          className="w-12 h-12 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors select-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {atMax ? (
          <motion.span
            key="max"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            className="text-xs font-medium text-amber-400"
          >
            {t('product.maxAvailable')}
          </motion.span>
        ) : (
          <motion.span
            key="stock"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            className="text-xs text-[#8e8e9a]"
          >
            {t('product.outOf', { count: stock })}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

function AddToCartButton({ mainCTARef, inStock, justAdded, onAdd, t }) {
  return (
    <motion.button
      ref={mainCTARef}
      onClick={onAdd}
      disabled={!inStock}
      whileTap={inStock && !justAdded ? { scale: 0.97 } : {}}
      className={`relative h-14 rounded-2xl font-semibold text-sm overflow-hidden transition-all duration-300 ${
        !inStock
          ? 'bg-white/5 text-[#8e8e9a] cursor-not-allowed border border-white/8'
          : justAdded
          ? 'bg-emerald-500 text-white shadow-[0_0_28px_rgba(16,185,129,0.45)]'
          : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white shadow-[0_0_20px_rgba(23,71,168,0.3)] hover:shadow-[0_0_36px_rgba(23,71,168,0.5)]'
      }`}
    >
      <AnimatePresence>
        {justAdded && (
          <motion.span
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {justAdded ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.svg
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </motion.svg>
            <span>{t('product.addedBtn')}</span>
          </motion.div>
        ) : (
          <motion.div
            key="add"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
            </svg>
            <span>{inStock ? t('product.addToCart') : t('product.outOfStock')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function TitleAndBadges({ product, variantes, tallaSeleccionada, onSelectTalla, stockBadge, stockLabel, onNavigate, t }) {
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
        ✓ {t('socialProof.warranty')}
      </span>
    </div>
  )
}

export default function ProductInfo({
  product,
  variantes,
  tallaSeleccionada,
  onSelectTalla,
  quantity,
  onDecrease,
  onIncrease,
  onAdd,
  justAdded,
  inStock,
  atMax,
  mainCTARef,
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toggle: toggleWishlist, isLiked } = useWishlistStore()
  const { badge: stockBadge, label: stockLabel } = stockDesdeProducto(product, t)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-3 sm:gap-5"
    >
      <TitleAndBadges
        product={product}
        variantes={variantes}
        tallaSeleccionada={tallaSeleccionada}
        onSelectTalla={onSelectTalla}
        stockBadge={stockBadge}
        stockLabel={stockLabel}
        onNavigate={navigate}
        t={t}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-3xl sm:text-4xl font-bold text-[#e8e8ed]">
          {formatPrice(product.precio)}
        </span>
        <motion.button
          onClick={() => toggleWishlist(product)}
          whileTap={{ scale: 0.78 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
            isLiked(product.id)
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'border-white/10 text-[#8e8e9a] hover:text-white hover:border-white/25'
          }`}
        >
          <HeartDetailIcon filled={isLiked(product.id)} />
          <span className="hidden sm:inline">{isLiked(product.id) ? t('product.saved') : t('common.save')}</span>
        </motion.button>
      </div>

      <SocialProof productId={product.id} />

      {product.descripcion && (
        <p className="text-sm text-[#8e8e9a] leading-relaxed">{product.descripcion}</p>
      )}

      {inStock && product.stock <= 5 && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 w-fit"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-xs font-medium text-amber-400">
            {product.stock <= 3
              ? t('product.urgentStock', { count: product.stock })
              : t('product.lowStock', { count: product.stock })}
          </span>
        </motion.div>
      )}

      {inStock && (
        <QuantitySelector
          quantity={quantity}
          stock={product.stock}
          atMax={atMax}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          t={t}
        />
      )}

      <AddToCartButton
        mainCTARef={mainCTARef}
        inStock={inStock}
        justAdded={justAdded}
        onAdd={onAdd}
        t={t}
      />

      <TrustBadges />
    </motion.div>
  )
}

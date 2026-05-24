import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// Deterministic mock stats — same product always shows same numbers
function getMockStats(id) {
  const n = typeof id === 'string'
    ? id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    : Number(id) || 1
  const stars  = parseFloat(Math.min(5, 3.9 + ((n % 11) / 10)).toFixed(1))
  const count  = 14  + (n % 312)  // 14 – 325 reviews
  const bought = 28  + (n % 580)  // 28 – 607 purchases
  return { stars, count, bought }
}

export default function SocialProof({ productId }) {
  const { t } = useTranslation()
  const { stars, count, bought } = getMockStats(productId)
  const fullStars = Math.floor(stars)
  const hasHalf  = stars % 1 >= 0.3

  return (
    <div className="space-y-3">
      {/* Stars row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-0.5" aria-label={t('socialProof.ratingLabel', { stars })}>
          {[1, 2, 3, 4, 5].map((s) => (
            <StarIcon
              key={s}
              filled={s <= fullStars}
              half={!s <= fullStars && s === fullStars + 1 && hasHalf}
            />
          ))}
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>{stars}</span>
        <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          ({count.toLocaleString('es-CR')} {t('socialProof.reviews')})
        </span>
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {bought.toLocaleString('es-CR')} {t('socialProof.purchases')}
        </span>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-2">
        {TRUST_BADGES.map((b) => (
          <motion.span
            key={b.key}
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border"
            style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)', background: 'color-mix(in srgb, var(--hc-surface) 70%, transparent)' }}
          >
            <span className="text-xs">{b.icon}</span>
            {t(b.key)}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

const TRUST_BADGES = [
  { icon: '🔒', key: 'socialProof.secure' },
  { icon: '↩',  key: 'socialProof.warranty' },
  { icon: '🚚', key: 'socialProof.shipping' },
  { icon: '⭐', key: 'socialProof.satisfied' },
]

function StarIcon({ filled, half }) {
  const path = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

  if (filled) {
    return (
      <svg className="w-4 h-4 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
        <path d={path} />
      </svg>
    )
  }
  if (half) {
    return (
      <svg className="w-4 h-4 text-amber-400" viewBox="0 0 20 20">
        <defs>
          <linearGradient id="hc-star-half">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={path} fill="url(#hc-star-half)" stroke="currentColor" strokeWidth="0.6" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ color: 'var(--hc-muted)' }}>
      <path d={path} />
    </svg>
  )
}

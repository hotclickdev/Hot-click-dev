import { useTranslation } from 'react-i18next'
import { TrustShieldSVG, TrustLockSVG, TrustWASVG, TrustTruckSVG } from './productIcons'

export default function TrustBadges() {
  const { t } = useTranslation()
  const badges = [
    { svg: <TrustShieldSVG />, text: t('socialProof.warranty'), color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
    { svg: <TrustLockSVG />, text: t('product.trustPayment'), color: 'text-[#4f7cff]', bg: 'bg-[#4f7cff]/8', border: 'border-[#4f7cff]/15' },
    { svg: <TrustWASVG />, text: t('product.trustWhatsapp'), color: 'text-[#25D366]', bg: 'bg-[#25D366]/8', border: 'border-[#25D366]/15' },
    { svg: <TrustTruckSVG />, text: t('product.trustShipping'), color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {badges.map(({ svg, text, color, bg, border }) => (
        <div key={text} className={`flex items-center gap-2.5 p-3 rounded-xl ${bg} border ${border}`}>
          <span className={`shrink-0 ${color}`}>{svg}</span>
          <span className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{text}</span>
        </div>
      ))}
    </div>
  )
}

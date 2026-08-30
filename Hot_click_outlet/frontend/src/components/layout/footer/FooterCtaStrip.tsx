import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HotClickMark } from '@/components/ui/BrandLogo'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function FooterCtaStrip() {
  const { t } = useTranslation()
  return (
    <div style={{
      background: 'var(--hc-blue-900)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse 60% 80% at 10% 50%, rgba(255,255,255,0.07) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 90% 50%, rgba(255,255,255,0.04) 0%, transparent 55%)',
      }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
          <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)', '--hc-wordmark-hot': '#F0524A', '--hc-wordmark-click': '#FFFFFF' } as CSSProperties}>
            <HotClickMark size={22} gap="#152B5E" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {t('footer.ctaNegocio')}{' '}
              <span style={{ color: 'var(--hc-blue-200)' }}>{t('footer.ctaVende')}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.68)' }}>
              {t('footer.ctaBeneficios')}
            </p>
          </div>
        </div>
        <Link
          to="/registro-empresa"
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'var(--hc-red-500)', color: 'white',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            whiteSpace: 'nowrap',
          }}
        >
          <TextoFlecha>{t('footer.ctaRegistro')}</TextoFlecha>
        </Link>
      </div>
    </div>
  )
}

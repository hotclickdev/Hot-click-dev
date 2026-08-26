import { Link } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function FooterCtaStrip() {
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
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)', '--hc-wordmark-hot': '#F0524A', '--hc-wordmark-click': '#FFFFFF' }}>
            <HotClickMark size={22} gap="#152B5E" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              ¿Tenés un negocio?{' '}
              <span style={{ color: 'var(--hc-blue-200)' }}>Vendé en HotClick</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.68)' }}>
              Sin comisiones el primer mes · Tienda activa en 24h · 100% gratis para empezar
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
          <TextoFlecha>Registrá tu emprendimiento</TextoFlecha>
        </Link>
      </div>
    </div>
  )
}

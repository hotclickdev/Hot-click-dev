import { Link } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'

export default function FooterCtaStrip() {
  return (
    <div style={{
      background: 'var(--hc-n-950)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse 60% 80% at 10% 50%, color-mix(in srgb, var(--hc-purple) 28%, transparent) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 90% 50%, color-mix(in srgb, var(--hc-cyan) 22%, transparent) 0%, transparent 55%)',
      }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
          <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center overflow-hidden">
            <HotClickMark size={36} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              ¿Tenés un negocio?{' '}
              <span className="text-gradient-accent">Vendé en HOTCLICK</span>
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
            background: 'var(--hc-primary)', color: 'white',
            boxShadow: '0 4px 16px color-mix(in srgb, var(--hc-purple) 35%, transparent)',
            whiteSpace: 'nowrap',
          }}
        >
          Registrá tu emprendimiento →
        </Link>
      </div>
    </div>
  )
}

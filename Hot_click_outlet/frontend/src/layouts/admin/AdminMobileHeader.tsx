import type { Dispatch, SetStateAction } from 'react'
import { NavLink, type Location, type NavigateFunction } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { HotClickMark } from '@/components/ui/BrandLogo'
import TrustGlyph from '@/components/ui/TrustGlyph'
import ThemeToggle from '@/components/ui/ThemeToggle'
import TextoFlecha from '@/components/ui/TextoFlecha'

export type AdminMobileHeaderProps = {
  etiquetaChrome: 'Admin' | 'Sistema'
  mostrarCaja: boolean
  t: TFunction
  userName: string | null
  location: Location
  navigate: NavigateFunction
  setDrawerOpen: Dispatch<SetStateAction<boolean>>
}

/** Header móvil del panel admin (Figma claro / Super Admin). */
export default function AdminMobileHeader({
  etiquetaChrome,
  mostrarCaja,
  t,
  userName,
  location,
  navigate,
  setDrawerOpen,
}: AdminMobileHeaderProps) {
  const esAdmin = etiquetaChrome === 'Admin'
  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 backdrop-blur-xl flex items-center gap-2.5 px-4"
      style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}
    >
      <button type="button"
        onClick={() => setDrawerOpen(true)}
        className="w-9 h-9 rounded-lg flex flex-col items-center justify-center gap-1 shrink-0 transition-colors hover:bg-[var(--hc-surface-2)]"
        style={{ border: '1px solid var(--hc-border)' }}
        aria-label={t('nav.menu')}
      >
        <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: 'var(--hc-text)' }} />
        <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: 'var(--hc-text)' }} />
        <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: 'var(--hc-text)' }} />
      </button>
      {location.pathname !== '/admin' && (
        <button type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-[var(--hc-surface-2)] transition-colors"
          style={{ color: 'var(--hc-text)' }}
          aria-label="Atrás"
        >
          <TrustGlyph tipo="atras" className="w-5 h-5" />
        </button>
      )}
      <HotClickMark size={28} className="shrink-0" />
      <div className="hc-wordmark text-sm"><span className="hot">Hot</span><span className="click">Click</span></div>
      <span
        className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
        style={{
          color: 'var(--hc-link)',
          backgroundColor: esAdmin ? 'rgba(13,71,161,0.10)' : 'rgba(23,71,168,0.08)',
        }}
      >
        {etiquetaChrome}
      </span>
      <div className="flex-1" />
      <ThemeToggle className="min-h-11 min-w-11 flex items-center justify-center shrink-0" />
      {mostrarCaja && (
        <NavLink to="/admin/pos"
          className="text-[13px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--hc-surface-2)]"
          style={{ color: 'var(--hc-link)', border: '1px solid var(--hc-border)' }}
        >
          <TextoFlecha>Caja</TextoFlecha>
        </NavLink>
      )}
      {!esAdmin && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: 'var(--hc-link)', color: '#fff' }}>
          {userName?.[0]?.toUpperCase() || 'A'}
        </div>
      )}
    </header>
  )
}

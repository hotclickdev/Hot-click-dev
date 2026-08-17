import { NavLink } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'

/** Header móvil del panel admin (Sistema claro vs Admin oscuro). */
export default function AdminMobileHeader({ isLightSidebar, t, userName, location, navigate, setDrawerOpen }) {
  return isLightSidebar ? (
        /* Sistema (EMPRENDEDOR) sigue el patrón del mockup móvil aprobado:
           hamburguesa a la izquierda, wordmark + pill "Sistema", acceso
           directo a la Caja y avatar a la derecha. */
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
          <HotClickMark size={22} className="shrink-0" />
          <div className="hc-wordmark text-sm"><span className="hot">Hot</span><span className="click">Click</span></div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: 'var(--hc-link)', backgroundColor: 'rgba(23,71,168,0.08)' }}>
            Sistema
          </span>
          <div className="flex-1" />
          <NavLink to="/admin/pos"
            className="text-[13px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--hc-surface-2)]"
            style={{ color: 'var(--hc-link)', border: '1px solid var(--hc-border)' }}
          >
            Caja →
          </NavLink>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: 'var(--hc-link)', color: '#fff' }}>
            {userName?.[0]?.toUpperCase() || 'A'}
          </div>
        </header>
      ) : (
        <header
          className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 backdrop-blur-xl flex items-center justify-between px-4"
          style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}
        >
          <div className="flex items-center gap-1.5">
            {/* Botón atrás — visible en sub-páginas, oculto en el dashboard raíz */}
            {location.pathname !== '/admin' && (
              <button type="button"
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-lg hover:bg-[var(--hc-surface-2)] transition-colors mr-0.5"
                style={{ color: 'var(--hc-text)' }}
                aria-label="Atrás"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
            )}
            <HotClickMark size={26} className="shrink-0" />
            <div className="hc-wordmark text-sm"><span className="hot">Hot</span><span className="click">Click</span></div>
            <span className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Admin</span>
          </div>
          <button type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-[var(--hc-surface-2)] transition-colors"
            style={{ color: 'var(--hc-muted)' }}
            aria-label={t('nav.menu')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </header>
  )
}

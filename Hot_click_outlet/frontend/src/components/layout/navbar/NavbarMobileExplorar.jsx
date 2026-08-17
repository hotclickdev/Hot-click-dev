import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HotClickMark } from '@/components/ui/BrandLogo'
import NavbarMobileCategorias from './NavbarMobileCategorias'

/** Sección Explorar del menú móvil. */
export default function NavbarMobileExplorar({
  location,
  categoriasOpen,
  setCategoriasOpen,
  categoriasPadre,
  loadCategorias,
  setMenuOpen,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.3, ease: [0.16,1,0.3,1] }}
    >
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 mb-2"
        style={{ color: 'var(--hc-muted)' }}>Explorar</p>
      <div className="flex flex-col gap-0.5">
        {/* Inicio */}
        {(() => {
          const isActive = location.pathname === '/'
          return (
            <Link to="/" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={{ color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)', backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? 'var(--hc-surface-2)' : 'transparent'; e.currentTarget.style.color = isActive ? 'var(--hc-text)' : 'var(--hc-muted)' }}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: isActive ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-surface)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
                  style={{ color: isActive ? 'var(--hc-accent)' : 'inherit' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </span>
              <span className="text-sm font-medium">Inicio</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-accent)' }} />}
            </Link>
          )
        })()}

        {/* Productos + submenú de categorías padre */}
        <NavbarMobileCategorias
          location={location}
          categoriasOpen={categoriasOpen}
          setCategoriasOpen={setCategoriasOpen}
          categoriasPadre={categoriasPadre}
          loadCategorias={loadCategorias}
          setMenuOpen={setMenuOpen}
        />

        {/* Emprendimientos */}
        {(() => {
          const isActive = location.pathname === '/emprendimientos'
          return (
            <Link to="/emprendimientos" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={{ color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)', backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? 'var(--hc-surface-2)' : 'transparent'; e.currentTarget.style.color = isActive ? 'var(--hc-text)' : 'var(--hc-muted)' }}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: isActive ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-surface)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
                  style={{ color: isActive ? 'var(--hc-accent)' : 'inherit' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <span className="text-sm font-medium">Emprendimientos</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-accent)' }} />}
            </Link>
          )
        })()}

        {/* Servicios HOT — destacado */}
        <Link to="/servicios" onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
          style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--hc-accent) 18%, transparent)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--hc-accent) 10%, transparent)' }}
        >
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 20%, transparent)' }}>
            <HotClickMark size={18} />
          </span>
          <span className="text-sm font-semibold">✦ Servicios HOT</span>
        </Link>
      </div>
    </motion.div>
  )
}

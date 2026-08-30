import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import CategoriaGlyph from '@/pages/catalogo/CategoriaGlyph'
import type { NavbarMobileMenuProps } from './NavbarMobileMenu'

/** Productos + submenú de categorías padre del menú móvil. */
export default function NavbarMobileCategorias({
  location,
  categoriasOpen,
  setCategoriasOpen,
  categoriasPadre,
  loadCategorias,
  setMenuOpen,
}: Pick<NavbarMobileMenuProps, 'location' | 'categoriasOpen' | 'setCategoriasOpen' | 'categoriasPadre' | 'loadCategorias' | 'setMenuOpen'>) {
  const { t } = useTranslation()
  const enProductos = location.pathname === '/productos'

  return (
    <div>
      <button type="button"
        onClick={() => { setCategoriasOpen(o => !o); loadCategorias() }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
        style={{ color: enProductos ? 'var(--hc-text)' : 'var(--hc-muted)', backgroundColor: enProductos ? 'var(--hc-surface-2)' : 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = enProductos ? 'var(--hc-surface-2)' : 'transparent'; e.currentTarget.style.color = enProductos ? 'var(--hc-text)' : 'var(--hc-muted)' }}
      >
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: enProductos ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-surface)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
            style={{ color: enProductos ? 'var(--hc-accent)' : 'inherit' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </span>
        <span className="text-sm font-medium">{t('nav.productos')}</span>
        <svg className="w-3.5 h-3.5 ml-auto transition-transform duration-200 shrink-0"
          style={{ transform: categoriasOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--hc-muted)' }}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {categoriasOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16,1,0.3,1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex flex-col gap-0.5 pl-4 pt-1 pb-1">
              <Link to="/productos" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={{ color: 'var(--hc-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--hc-muted)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-border)' }}></span>
                <span>{t('nav.todosProductos')}</span>
              </Link>
              {categoriasPadre.map(cat => (
                <Link key={String(cat.id)}
                  to={`/productos?cat=${encodeURIComponent(String(cat.id))}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                  style={{ color: 'var(--hc-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--hc-muted)' }}
                >
                  <CategoriaGlyph
                    icono={cat.icono}
                    nombre={cat.nombreCategoria}
                    className="w-3.5 h-3.5 shrink-0"
                  />
                  {cat.nombreCategoria}
                </Link>
              ))}
              {categoriasPadre.length === 0 && (
                <span className="px-3 py-2 text-xs" style={{ color: 'var(--hc-muted)' }}>{t('common.loading')}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

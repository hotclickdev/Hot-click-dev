import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { NavbarMobileMenuProps } from './NavbarMobileMenu'

/** Sección Información del menú móvil. */
export default function NavbarMobileInformacion({
  location,
  setMenuOpen,
}: Pick<NavbarMobileMenuProps, 'location' | 'setMenuOpen'>) {
  const { t } = useTranslation()
  const links = [
    { to: '/descubri', label: t('nav.descubri'), icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /> },
    { to: '/registro-empresa', label: t('nav.vender'), icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { to: '/nosotros', label: t('nav.nosotros'), icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { to: '/contacto', label: t('nav.contacto'), icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
    { to: '/informacion', label: t('nav.informacion'), icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.3, ease: [0.16,1,0.3,1] }}
    >
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 mb-2"
        style={{ color: 'var(--hc-muted)' }}>{t('nav.mas')}</p>
      <div className="flex flex-col gap-0.5">
        {links.map(({ to, label, icon }) => {
          const isActive = location.pathname === to
          return (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={{ color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)', backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? 'var(--hc-surface-2)' : 'transparent'; e.currentTarget.style.color = isActive ? 'var(--hc-text)' : 'var(--hc-muted)' }}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: isActive ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-surface)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
                  style={{ color: isActive ? 'var(--hc-accent)' : 'inherit' }}>{icon}</svg>
              </span>
              <span className="text-sm font-medium">{label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-accent)' }} />}
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}

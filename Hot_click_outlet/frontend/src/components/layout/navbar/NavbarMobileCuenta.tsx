import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { NavbarMobileMenuProps } from './NavbarMobileMenu'

/** Sección Mi cuenta / auth del menú móvil. */
export default function NavbarMobileCuenta({
  token,
  userName,
  isAdmin,
  setMenuOpen,
  onLogout,
}: Pick<NavbarMobileMenuProps, 'token' | 'userName' | 'isAdmin' | 'setMenuOpen' | 'onLogout'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.3, ease: [0.16,1,0.3,1] }}
    >
      {token ? (
        <>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 mb-2"
            style={{ color: 'var(--hc-muted)' }}>Mi cuenta</p>
          {/* Avatar */}
          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 18%, transparent)', color: 'var(--hc-accent)' }}>
              {userName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{userName || 'Usuario'}</p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Cuenta activa</p>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            {[
              { to: '/perfil', label: 'Mi perfil', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
              { to: '/mis-pedidos', label: 'Mis pedidos', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
            ].map(({ to, label, icon }) => (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                style={{ color: 'var(--hc-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--hc-muted)' }}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--hc-surface)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">{icon}</svg>
                </span>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
            {isAdmin() && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                style={{ color: 'var(--hc-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--hc-muted)' }}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--hc-surface)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span className="text-sm font-medium">Panel Admin</span>
              </Link>
            )}
            <button type="button"
              onClick={() => { onLogout(); setMenuOpen(false) }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 w-full text-left"
              style={{ color: '#f87171' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(248,113,113,0.1)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
              <span className="text-sm font-medium">Cerrar sesión</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 mb-3"
            style={{ color: 'var(--hc-muted)' }}>Mi cuenta</p>
          <div className="flex flex-col gap-2">
            <Link to="/login" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{ color: 'var(--hc-text)', backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              Ingresar
            </Link>
            <Link to="/registro" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150"
              style={{ backgroundColor: 'var(--hc-accent)' }}
            >
              Crear cuenta gratis
            </Link>
          </div>
        </>
      )}
    </motion.div>
  )
}

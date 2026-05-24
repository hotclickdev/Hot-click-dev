import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useUiStore from '@/store/uiStore'

export default function Navbar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { token, userName, logout, isAdmin } = useAuthStore()
  const cartCount = useCartStore((s) => s.count())
  const wishlistCount = useWishlistStore((s) => s.count())
  const { setCartDrawerOpen, setSearchOpen } = useUiStore()
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)
  const prevCartCount = useRef(cartCount)

  const navLinks = [
    { href: '/', label: t('nav.inicio') },
    { href: '/productos', label: t('nav.productos') },
    { href: '/servicios', label: 'Servicios HOT', highlight: true },
    { href: '/informacion', label: t('nav.informacion') },
    { href: '/nosotros', label: t('nav.nosotros') },
    { href: '/contacto', label: t('nav.contacto') },
  ]

  const mobileSecondaryLinks = [
    { href: '/servicios', label: '✦ Servicios HOT', highlight: true },
    { href: '/informacion', label: t('nav.informacion') },
    { href: '/nosotros', label: t('nav.nosotros') },
    { href: '/contacto', label: t('nav.contacto') },
  ]

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 600)
    }
    prevCartCount.current = cartCount
  }, [cartCount])

  useEffect(() => {
    let rafId = null
    const onScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY
        setScrolled(y > 20)
        const docH = document.documentElement.scrollHeight - window.innerHeight
        setScrollProgress(docH > 0 ? Math.min(y / docH, 1) : 0)
        rafId = null
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  useEffect(() => setMenuOpen(false), [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      {/* Scroll progress indicator */}
      <div
        className="hc-progress"
        style={{ transform: `scaleX(${scrollProgress})`, opacity: scrollProgress > 0.01 ? 1 : 0 }}
      />

      <header
        className={`
          fixed top-0 left-0 right-0 z-40 transition-all duration-300
          ${scrolled
            ? 'hc-navbar-scrolled backdrop-blur-xl border-b shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
            : 'bg-transparent'
          }
        `}
        style={scrolled ? { borderBottomColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' } : {}}
      >
        <nav className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 hc-nav-inner ${scrolled ? 'h-12' : 'h-14'}`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 hc-logo-badge transition-transform duration-200 group-hover:scale-105">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h8l-2 8 12-12h-8z"/>
              </svg>
            </div>
            <span className="text-[18px] leading-none uppercase hc-logo-text transition-opacity duration-200 group-hover:opacity-80"
              style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900 }}>
              HOTCLICK
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href
              if (link.highlight) {
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                      color: isActive ? '#fff' : 'var(--hc-accent)',
                      backgroundColor: isActive ? 'var(--hc-accent)' : 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-accent)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = isActive ? 'var(--hc-accent)' : 'color-mix(in srgb, var(--hc-accent) 10%, transparent)'
                      e.currentTarget.style.color = isActive ? '#fff' : 'var(--hc-accent)'
                    }}
                  >
                    ✦ {link.label}
                  </Link>
                )
              }
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)',
                    backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--hc-text)'
                      e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--hc-muted)'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: 'var(--hc-accent)' }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label={t('nav.buscar')}
              className="p-2 rounded-lg transition-all duration-150 hover:scale-105"
              style={{ color: 'var(--hc-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--hc-text)'; e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--hc-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <SearchNavIcon />
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              aria-label={t('nav.wishlist')}
              className="relative p-2 rounded-lg transition-all duration-150 hover:scale-105"
              style={{ color: 'var(--hc-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--hc-text)'; e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--hc-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <WishlistNavIcon />
              <AnimatePresence>
                {wishlistCount > 0 && (
                  <motion.span
                    key={wishlistCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ boxShadow: '0 0 10px rgba(239,68,68,0.55)' }}
                  >
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Cart */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              aria-label={t('bnav.carrito')}
              className="relative p-2 rounded-lg transition-all duration-150 hover:scale-105"
              style={{ color: 'var(--hc-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--hc-text)'; e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--hc-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <motion.div
                className="hc-animate-gpu"
                animate={cartBounce ? { scale: [1, 1.35, 0.88, 1.12, 1], rotate: [0, -12, 10, -6, 0] } : {}}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <CartIcon />
              </motion.div>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: 'var(--hc-accent)', boxShadow: '0 0 10px color-mix(in srgb, var(--hc-accent) 60%, transparent)' }}
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Auth */}
            {token ? (
              <div className="flex items-center gap-1">
                {isAdmin() && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ color: 'var(--hc-muted)' }}
                  >
                    <span className="text-xs">⚙</span>
                    {t('nav.admin')}
                  </Link>
                )}
                <Link
                  to="/mis-pedidos"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  {t('nav.misPedidos')}
                </Link>
                <Link
                  to="/perfil"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200"
                  style={{ backgroundColor: 'var(--hc-surface-2)', borderColor: 'var(--hc-border)' }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 18%, transparent)', color: 'var(--hc-accent)' }}>
                    {userName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm max-w-[80px] truncate hidden sm:block" style={{ color: 'var(--hc-text)' }}>
                    {userName?.split(' ')[0] || t('nav.perfil')}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  aria-label={t('nav.cerrarSesion')}
                  className="hidden md:flex p-2 rounded-lg transition-colors hover:text-red-400"
                  style={{ color: 'var(--hc-muted)' }}
                  title={t('nav.cerrarSesion')}
                >
                  <LogoutIcon />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hc-btn hc-btn-primary hc-btn-sm text-sm font-semibold"
              >
                {t('nav.ingresar')}
              </Link>
            )}

            {/* Mobile menu */}
            <button
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--hc-muted)' }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t('nav.menu')}
              aria-expanded={menuOpen}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="hc-mobile-menu fixed top-16 left-0 right-0 z-30 backdrop-blur-xl border-b md:hidden"
            style={{ borderBottomColor: 'var(--hc-border)' }}
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-0.5">
              {mobileSecondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    color: link.highlight
                      ? 'var(--hc-accent)'
                      : location.pathname === link.href ? 'var(--hc-text)' : 'var(--hc-muted)',
                    backgroundColor: link.highlight
                      ? 'color-mix(in srgb, var(--hc-accent) 10%, transparent)'
                      : location.pathname === link.href ? 'var(--hc-surface-2)' : 'transparent',
                    fontWeight: link.highlight ? 600 : undefined,
                  }}
                >
                  {link.label}
                </Link>
              ))}
              {token && isAdmin() && (
                <Link to="/admin" className="px-4 py-3 rounded-xl text-sm transition-colors"
                  style={{ color: 'var(--hc-muted)' }}>
                  ⚙ {t('nav.admin')}
                </Link>
              )}
              {token && (
                <Link to="/mis-pedidos" className="px-4 py-3 rounded-xl text-sm transition-colors"
                  style={{ color: 'var(--hc-muted)' }}>
                  {t('nav.misPedidos')}
                </Link>
              )}
              {token && (
                <button
                  onClick={handleLogout}
                  className="px-4 py-3 rounded-xl text-sm text-red-400 text-left"
                >
                  {t('nav.cerrarSesion')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function SearchNavIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function WishlistNavIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function MenuIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

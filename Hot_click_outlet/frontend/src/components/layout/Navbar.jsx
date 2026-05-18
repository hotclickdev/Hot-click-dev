import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'

export default function Navbar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { token, userName, logout, isAdmin } = useAuthStore()
  const cartCount = useCartStore((s) => s.count())
  const wishlistCount = useWishlistStore((s) => s.count())
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)
  const prevCartCount = useRef(cartCount)

  const navLinks = [
    { href: '/', label: t('nav.inicio') },
    { href: '/productos', label: t('nav.productos') },
    { href: '/informacion', label: t('nav.informacion') },
    { href: '/nosotros', label: t('nav.nosotros') },
    { href: '/contacto', label: t('nav.contacto') },
  ]

  const mobileSecondaryLinks = [
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
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 20)
      const docH = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(docH > 0 ? Math.min(y / docH, 1) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
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
        <nav className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 hc-nav-inner ${scrolled ? 'h-14' : 'h-16'}`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 hc-logo-badge transition-transform duration-200 group-hover:scale-105">
              <span className="text-white text-[13px] leading-none" style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900 }}>HC</span>
            </div>
            <span className="text-[22px] leading-none uppercase hc-logo-text transition-opacity duration-200 group-hover:opacity-80"
              style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900 }}>
              HOTCLICK
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors duration-200"
                style={{
                  color: location.pathname === link.href ? 'var(--hc-text)' : 'var(--hc-muted)',
                  backgroundColor: location.pathname === link.href ? 'var(--hc-surface-2)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Wishlist */}
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: 'var(--hc-muted)' }}
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
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  >
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Cart */}
            <Link
              to="/carrito"
              aria-label={t('bnav.carrito')}
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: 'var(--hc-muted)' }}
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
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#4f7cff] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(79,124,255,0.6)]"
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

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
                  Mis pedidos
                </Link>
                <Link
                  to="/perfil"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200"
                  style={{ backgroundColor: 'var(--hc-surface-2)', borderColor: 'var(--hc-border)' }}
                >
                  <div className="w-6 h-6 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-xs font-semibold text-[#4f7cff]">
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
                className="px-4 py-1.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white text-sm font-medium transition-all duration-200 shadow-[0_0_16px_rgba(79,124,255,0.25)] hover:shadow-[0_0_24px_rgba(79,124,255,0.4)]"
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
                    color: location.pathname === link.href ? 'var(--hc-text)' : 'var(--hc-muted)',
                    backgroundColor: location.pathname === link.href ? 'var(--hc-surface-2)' : 'transparent',
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
                  Mis pedidos
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

function WishlistNavIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
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

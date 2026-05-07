import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/productos', label: 'Productos' },
  { href: '/informacion', label: 'Información' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
]

// Solo enlaces secundarios para el menú mobile (los principales están en BottomNav)
const mobileSecondaryLinks = [
  { href: '/informacion', label: 'Información' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, userName, logout, isAdmin } = useAuthStore()
  const cartCount = useCartStore((s) => s.count())
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)
  const prevCartCount = useRef(cartCount)

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 600)
    }
    prevCartCount.current = cartCount
  }, [cartCount])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-40 transition-all duration-300
          ${scrolled
            ? 'bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/8 shadow-[0_1px_0_rgba(255,255,255,0.05)]'
            : 'bg-transparent'
          }
        `}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f7cff 0%, #2554e8 100%)', boxShadow: '0 0 18px rgba(79,124,255,0.5)' }}>
              <span className="text-white text-[13px] leading-none" style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900 }}>HC</span>
            </div>
            <span className="text-[22px] leading-none uppercase"
              style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900, background: 'linear-gradient(90deg, #6b9fff 0%, #4f7cff 55%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              HOTCLICK
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`
                  px-3 py-1.5 rounded-lg text-sm transition-colors duration-200
                  ${location.pathname === link.href
                    ? 'text-white bg-white/8'
                    : 'text-[#8e8e9a] hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link
              to="/carrito"
              className="relative p-2 text-[#8e8e9a] hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <motion.div
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
              <div className="flex items-center gap-2">
                {isAdmin() && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs">⚙</span>
                    Admin
                  </Link>
                )}
                <Link
                  to="/perfil"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 transition-all duration-200"
                >
                  <div className="w-6 h-6 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-xs font-semibold text-[#4f7cff]">
                    {userName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm text-[#e8e8ed] max-w-[80px] truncate hidden sm:block">
                    {userName?.split(' ')[0] || 'Perfil'}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden md:flex p-2 text-[#8e8e9a] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5"
                  title="Cerrar sesión"
                >
                  <LogoutIcon />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white text-sm font-medium transition-all duration-200 shadow-[0_0_16px_rgba(79,124,255,0.25)] hover:shadow-[0_0_24px_rgba(79,124,255,0.4)]"
              >
                Ingresar
              </Link>
            )}

            {/* Mobile menu — solo páginas secundarias */}
            <button
              className="md:hidden p-2 text-[#8e8e9a] hover:text-white transition-colors rounded-lg hover:bg-white/5"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile dropdown — solo páginas secundarias (main nav está en BottomNav) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed top-16 left-0 right-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/8 md:hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-0.5">
              {mobileSecondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`
                    px-4 py-3 rounded-xl text-sm font-medium transition-colors
                    ${location.pathname === link.href
                      ? 'text-white bg-white/8'
                      : 'text-[#8e8e9a] hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
              {token && isAdmin() && (
                <Link to="/admin" className="px-4 py-3 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5">
                  ⚙ Panel Admin
                </Link>
              )}
              {token && (
                <button
                  onClick={handleLogout}
                  className="px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/8 text-left"
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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

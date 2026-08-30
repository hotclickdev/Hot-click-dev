import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { TFunction } from 'i18next'
import useWishlistStore from '@/store/wishlistStore'
import useUiStore from '@/store/uiStore'
import useRutaPanel from '@/app/useRutaPanel'
import {
  SearchNavIcon,
  WishlistNavIcon,
  CartIcon,
  AdminNavIcon,
  LogoutIcon,
} from './navbarIcons'

export type NavbarActionsProps = {
  t: TFunction
  token: string | null
  userName: string | null
  isAdmin: () => boolean
  cartCount: number
  cartBounce: boolean
  onLogout: () => void
}

/** Acciones derecha del navbar (búsqueda, wishlist, carrito, auth). */
export default function NavbarActions({
  t,
  token,
  userName,
  isAdmin,
  cartCount,
  cartBounce,
  onLogout,
}: NavbarActionsProps) {
  const wishlistCount = useWishlistStore((s) => s.count())
  const { setSearchOpen } = useUiStore()
  const rutaPanel = useRutaPanel()

  return (
    <div className="flex items-center gap-1">
      <button type="button"
        onClick={() => setSearchOpen(true)}
        aria-label={t('nav.buscar')}
        className="p-2 rounded-lg transition-all duration-150 hover:scale-105"
        style={{ color: 'var(--hc-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hc-text)'; e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--hc-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <SearchNavIcon />
      </button>

      <Link
        to="/wishlist"
        aria-label={t('nav.wishlist')}
        className="relative p-2 rounded-lg transition-all duration-150 hover:scale-105"
        style={{ color: 'var(--hc-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hc-text)'; e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--hc-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
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

      <Link
        to="/carrito"
        aria-label={t('bnav.pedido')}
        className="relative p-2 rounded-lg transition-all duration-150 hover:scale-105"
        style={{ color: 'var(--hc-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hc-text)'; e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--hc-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
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
      </Link>

      {token ? (
        <div className="flex items-center gap-1">
          {isAdmin() && (
            <Link
              to={rutaPanel}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--hc-muted)' }}
            >
              <AdminNavIcon />
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
          <button type="button"
            onClick={onLogout}
            aria-label={t('nav.cerrarSesion')}
            className="hidden md:flex p-2 rounded-lg transition-colors hover:text-red-400"
            style={{ color: 'var(--hc-muted)' }}
            title={t('nav.cerrarSesion')}
          >
            <LogoutIcon />
          </button>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/login"
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ color: 'var(--hc-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hc-text)'; e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--hc-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            {t('nav.ingresar')}
          </Link>
          <Link
            to="/registro"
            className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--hc-accent)', boxShadow: '0 0 16px color-mix(in srgb, var(--hc-accent) 35%, transparent)' }}
          >
            {t('nav.crearCuenta')}
          </Link>
        </div>
      )}
    </div>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { ReactElement } from 'react'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { itemsBottomNav, estaTabActiva } from './bottomNavItems'
import { esRutaTienda } from '@/utils/rutaTienda'

const ICONOS: Record<string, (props: { active: boolean }) => ReactElement> = {
  comprar: ShopIcon,
  vender: VenderIcon,
  emprender: EmprenderIcon,
  pedido: CartNavIcon,
  cuenta: AccountIcon,
}

export default function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const cartCount = useCartStore((s) => s.count())
  const { token } = useAuthStore()

  if (location.pathname.startsWith('/admin') || esRutaTienda(location.pathname)) return null

  const cartBadge = cartCount > 9 ? '9+' : `${cartCount}`
  const items = itemsBottomNav({
    t,
    token,
    cartBadge: cartCount > 0 ? cartBadge : null,
  })

  return (
    <nav
      className="hc-bottom-nav fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-xl"
      aria-label={t('bnav.principal')}
      style={{
        backgroundColor: 'var(--hc-surface)',
        borderTop: '1px solid var(--hc-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const Icon = ICONOS[item.icon]
          const isActive = estaTabActiva(item, location.pathname)
          return (
            <Link
              key={item.id}
              to={item.href}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-1 flex-1 relative py-2 min-h-11 touch-manipulation"
            >
              {isActive && (
                <motion.div
                  layoutId="bnav-bar"
                  className="absolute top-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--hc-accent)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative">
                <Icon active={isActive} />
                {item.badge && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                    style={{
                      backgroundColor: 'var(--hc-accent)',
                      boxShadow: '0 0 8px color-mix(in srgb, var(--hc-accent) 55%, transparent)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium leading-none transition-colors"
                style={{ color: isActive ? 'var(--hc-accent)' : 'var(--hc-muted)' }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function ShopIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-[22px] h-[22px]" style={{ color: 'var(--hc-accent)' }} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875z" />
      <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
      <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
      <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 19.664 9.315 20.25 12 20.25z" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function VenderIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-[22px] h-[22px]" style={{ color: 'var(--hc-accent)' }} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 21h18V10.5L12 3 3 10.5V21zm8-2v-5h2v5h-2z" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6" />
    </svg>
  )
}

function EmprenderIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[22px] h-[22px]" style={{ color: active ? 'var(--hc-accent)' : 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}

function CartNavIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-[22px] h-[22px]" style={{ color: 'var(--hc-accent)' }} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function AccountIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-[22px] h-[22px]" style={{ color: 'var(--hc-accent)' }} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

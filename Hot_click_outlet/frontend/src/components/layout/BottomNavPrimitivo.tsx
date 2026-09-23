import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ReactElement, ReactNode } from 'react'

export type ItemBottomNavPrimitivo = {
  key: string
  to: string
  label: string
  /** Coincidencia exacta de ruta (equivalente a `end` de NavLink). */
  end?: boolean
  renderIcon: (props: { active: boolean }) => ReactElement
  badge?: ReactNode
  dataMm?: string
  /** Override para resolver el estado activo (rutas con prefijos custom, ej. varias secciones). */
  activo?: (pathname: string) => boolean
}

type BottomNavPrimitivoProps = {
  items: ItemBottomNavPrimitivo[]
  ariaLabel: string
  pathname: string
  /** `grid` = tabs en grilla fija (seller/emprendedor). `flex` = tabs distribuidas con barra activa animada (marketplace). */
  variant?: 'grid' | 'flex'
  className?: string
}

/**
 * Primitivo de bottom navigation reutilizable: items parametrizables, estado activo,
 * safe-area, touch target ≥44px y labels ≥11px (ver anexo-6 P2-02).
 */
export default function BottomNavPrimitivo({
  items,
  ariaLabel,
  pathname,
  variant = 'grid',
  className,
}: BottomNavPrimitivoProps) {
  if (variant === 'flex') {
    return (
      <nav
        className={`hc-bottom-nav fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-xl ${className ?? ''}`}
        aria-label={ariaLabel}
        style={{
          backgroundColor: 'var(--hc-surface)',
          borderTop: '1px solid var(--hc-border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-stretch h-16">
          {items.map((item) => {
            const active = esActivo(pathname, item)
            return (
              <Link
                key={item.key}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                data-mm={item.dataMm}
                className="flex flex-col items-center justify-center gap-1 flex-1 relative py-2 min-h-11 touch-manipulation"
              >
                {active && (
                  <motion.div
                    layoutId="bnav-bar"
                    className="absolute top-0 left-3 right-3 h-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--hc-accent)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <div className="relative">
                  {item.renderIcon({ active })}
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
                  className="text-[11px] font-medium leading-none transition-colors"
                  style={{ color: active ? 'var(--hc-accent)' : 'var(--hc-muted)' }}
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

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface pb-[env(safe-area-inset-bottom)] ${className ?? ''}`}
      aria-label={ariaLabel}
    >
      <ul className="grid px-1 py-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = esActivo(pathname, item)
          return (
            <li key={item.key}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                data-mm={item.dataMm}
                className="flex min-h-11 flex-col items-center justify-center gap-0.5 touch-manipulation"
              >
                {item.renderIcon({ active })}
                <span
                  className={`max-w-full px-0.5 text-center text-[11px] leading-tight ${
                    active ? 'font-bold text-hc-primary' : 'font-medium text-hc-muted'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function esActivo(pathname: string, item: ItemBottomNavPrimitivo): boolean {
  if (item.activo) return item.activo(pathname)
  if (item.end) return pathname === item.to || pathname === `${item.to}/`
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

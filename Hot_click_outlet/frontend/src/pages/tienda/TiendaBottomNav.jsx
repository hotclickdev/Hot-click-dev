import { Link, useLocation } from 'react-router-dom'
import { itemsTiendaBottomNav, estaTabTiendaActiva } from './tiendaBottomNavItems'

const ICONOS = {
  catalogo: CatalogoIcon,
  pedido: PedidoIcon,
  hotclick: HotClickIcon,
}

/**
 * Barra móvil de la tienda del vendedor: catálogo, pedido aislado, salida a HotClick.
 */
export default function TiendaBottomNav({ slug, cantidadCarrito }) {
  const { pathname } = useLocation()
  const items = itemsTiendaBottomNav(slug, cantidadCarrito)

  return (
    <nav
      className="hc-tienda-bottom-nav fixed bottom-0 left-0 right-0 z-40 md:hidden"
      aria-label="Navegación de esta tienda"
      style={{
        backgroundColor: 'var(--t-surface)',
        borderTop: '1px solid var(--t-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const Icon = ICONOS[item.id]
          const activa = estaTabTiendaActiva(item, pathname, slug)
          return (
            <Link
              key={item.id}
              to={item.href}
              aria-current={activa ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-1 flex-1 relative py-2 min-h-11 touch-manipulation"
              style={{ color: activa ? 'var(--t-accent)' : 'var(--t-muted)' }}
            >
              {activa && (
                <span
                  className="absolute top-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--t-accent)' }}
                />
              )}
              <span className="relative">
                <Icon />
                {item.badge && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: 'var(--t-primary)' }}
                  >
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function CatalogoIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function PedidoIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function HotClickIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

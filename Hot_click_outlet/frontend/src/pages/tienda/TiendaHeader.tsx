import { Link } from 'react-router-dom'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import TiendaAnfitrion from './TiendaAnfitrion'

/**
 * Navbar de la tienda del vendedor. Aisla el pedido de esta tienda
 * y nombra HotClick para no confundir con el marketplace.
 */
export default function TiendaHeader({
  slug, nombre, logoUrl, cantidadCarrito,
}: {
  slug: string
  nombre: string
  logoUrl?: string | null
  cantidadCarrito: number
}) {
  return (
    <header className="sticky top-0 z-40 shadow-sm" style={{ backgroundColor: 'var(--t-secondary)' }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link to={`/tienda/${slug}`} className="flex items-center gap-2 shrink min-w-0">
          {logoUrl
            ? <img src={logoUrl} alt="" className="h-8 w-auto object-contain shrink-0" />
            : <span className="hidden sm:inline text-white font-bold text-lg truncate max-w-[12rem]">{nombre}</span>}
          <TiendaAnfitrion nombre={nombre} className="text-[11px] text-white/75" />
        </Link>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/"
            className="hidden md:inline text-[11px] text-white/80 hover:text-white underline-offset-2 hover:underline"
          >
            Marketplace
          </Link>
          <Link
            to={`/tienda/${slug}/carrito`}
            className="relative text-white hover:text-white/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Pedido de esta tienda"
          >
            <ShoppingCartIcon className="h-6 w-6" />
            {cantidadCarrito > 0 && (
              <span
                className="absolute top-1.5 right-1.5 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                style={{ backgroundColor: 'var(--t-primary)' }}
              >
                {cantidadCarrito > 9 ? '9+' : cantidadCarrito}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

import { useEffect } from 'react'
import { Outlet, useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'

/**
 * Layout independiente para la tienda pública de un emprendedor.
 * Aplica los colores de branding del negocio como CSS custom properties.
 * No comparte navbar ni footer con HOTCLICK.
 */
export default function TiendaLayout() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const { empresa, setEmpresa, totalItems } = useTiendaStore()
  const cantidadCarrito = totalItems()

  useEffect(() => {
    tiendaService.getInfo(slug)
      .then(data => setEmpresa(slug, data))
      .catch(() => navigate('/404', { replace: true }))
  }, [slug])    // eslint-disable-line react-hooks/exhaustive-deps

  // Aplica branding del emprendedor como CSS vars en el root del layout
  const brandStyle = empresa ? {
    '--t-primary':   empresa.colorPrimario   ?? '#4F7CFF',
    '--t-secondary': empresa.colorSecundario ?? '#0A0A0B',
    '--t-accent':    empresa.colorAcento     ?? '#863BFF',
  } : {}

  const nombre = empresa?.nombreComercial ?? slug

  return (
    <div className="flex flex-col min-h-screen bg-gray-50" style={brandStyle}>
      {/* ── Navbar de la tienda ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 shadow-sm"
        style={{ backgroundColor: 'var(--t-secondary)' }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo / nombre */}
          <Link to={`/tienda/${slug}`} className="flex items-center gap-2 shrink-0">
            {empresa?.logoUrl
              ? <img src={empresa.logoUrl} alt={nombre} className="h-8 w-auto object-contain" />
              : <span className="text-white font-bold text-lg truncate max-w-[180px]">{nombre}</span>
            }
          </Link>

          {/* Carrito */}
          <Link
            to={`/tienda/${slug}/carrito`}
            className="relative text-white hover:text-gray-200 transition-colors"
            aria-label="Ver carrito"
          >
            <ShoppingCartIcon className="h-6 w-6" />
            {cantidadCarrito > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                style={{ backgroundColor: 'var(--t-primary)' }}
              >
                {cantidadCarrito > 9 ? '9+' : cantidadCarrito}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ── Contenido de la ruta ─────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer mínimo ────────────────────────────────────────────────── */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t bg-white">
        {empresa?.footerTexto
          ? <p>{empresa.footerTexto}</p>
          : <p>{nombre} &mdash; Tienda en línea powered by <span className="font-semibold text-gray-500">HOTCLICK</span></p>
        }
      </footer>
    </div>
  )
}

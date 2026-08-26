import { Link } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { RetryBanner } from '@/components/ui/RetryBanner'
import { useSistemaProductos } from './sistema-productos/useSistemaProductos'
import SistemaProductosListado from './sistema-productos/SistemaProductosListado'
import AccesoTiendaPublica from '@/components/sistema/AccesoTiendaPublica'
import TextoMas from '@/components/ui/TextoMas'

/**
 * Catálogo del dueño (rol EMPRENDEDOR, cualquier plan). Mockup Sistema - Productos.
 */
export default function SistemaProductos() {
  const page = useSistemaProductos()

  return (
    <div className="max-w-[1060px]">
      <header className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-tight m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>
            Productos
          </h1>
          <p className="text-[15px] m-0" style={{ color: '#6b6459' }}>
            {textoConteo(page.totalCatalogo, page.loading)}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <AccesoTiendaPublica variante="enlace" />
          </div>
        </div>
        <Link
          to="/admin/productos/nuevo"
          className="inline-flex items-center justify-center px-[22px] py-[13px] rounded-[10px] text-[15px] font-bold"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          <TextoMas>Agregá un producto</TextoMas>
        </Link>
      </header>

      {page.loadError && !page.loading && (
        <RetryBanner message="No se pudieron cargar los productos. Verificá tu conexión." onRetry={page.load} />
      )}
      {page.loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <SistemaProductosListado {...page} />
      )}
    </div>
  )
}

function textoConteo(total, loading) {
  if (loading) return 'Cargando tu catálogo…'
  if (total === 1) return '1 producto en tu catálogo.'
  return `${total} productos en tu catálogo.`
}

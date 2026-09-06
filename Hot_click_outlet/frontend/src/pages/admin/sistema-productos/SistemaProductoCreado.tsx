import { Link } from 'react-router-dom'
import { rutaProductoEnTienda, RUTA_SISTEMA_VISIBILIDAD } from '@/utils/rutaTienda'
import { useTiendaPublica } from '@/hooks/useTiendaPublica'
import CopiarLinkTienda from '@/components/sistema/CopiarLinkTienda'
import type { ProductoCreadoSistema } from './useSistemaProductoForm'

/**
 * Tras el alta: ver el producto en la tienda pública, o esperar activación.
 */
export default function SistemaProductoCreado({ producto, slug, tiendaPublica, onOtro }: {
  producto: ProductoCreadoSistema
  slug: string | null
  tiendaPublica: boolean
  onOtro: () => void
}) {
  const ruta = rutaProductoEnTienda(slug, producto.id)
  const rutaTienda = slug ? `/tienda/${slug}` : null

  return (
    <div className="max-w-md py-6">
      <h1 className="text-[26px] font-bold tracking-tight m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>
        {tiendaPublica ? 'Ya está en tu tienda' : 'Producto listo en Sistema'}
      </h1>
      <p className="text-[15px] mt-2" style={{ color: '#6b6459' }}>
        {producto.nombre}
      </p>
      {producto.imagenUrl && (
        <img
          src={producto.imagenUrl}
          alt=""
          className="w-28 h-28 object-cover rounded-2xl mt-5"
          style={{ border: '1px solid var(--hc-border)' }}
        />
      )}
      <HintPublicacion slug={slug} rutaTienda={rutaTienda} />
      <div className="flex flex-col gap-3 mt-8">
        {tiendaPublica && ruta && (
          <Link
            to={ruta}
            className="hc-btn hc-btn-primary inline-flex items-center justify-center min-h-11 px-5 py-3 rounded-[10px] text-[15px] font-bold"
          >
            Verlo en tu tienda
          </Link>
        )}
        <button
          type="button"
          onClick={onOtro}
          className="inline-flex items-center justify-center min-h-11 px-5 py-3 rounded-[10px] text-[15px] font-semibold"
          style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)', backgroundColor: 'var(--hc-surface)' }}
        >
          Agregar otro producto
        </button>
        <Link to="/admin/productos" className="text-center text-sm font-semibold min-h-11 flex items-center justify-center" style={{ color: 'var(--hc-accent)' }}>
          Ver el catálogo
        </Link>
      </div>
    </div>
  )
}

function HintPublicacion({ slug, rutaTienda }: { slug: string | null; rutaTienda: string | null }) {
  const { tiendaPublica, estadoEmpresa } = useTiendaPublica()
  if (tiendaPublica) {
    return (
      <div className="mt-4">
        <p className="text-sm mb-2" style={{ color: '#6b6459' }}>
          Así te ven los compradores. Copiá el link y mandáselo a quien quieras.
        </p>
        <CopiarLinkTienda ruta={rutaTienda ?? ''} mostrarUrl />
      </div>
    )
  }
  if (estadoEmpresa === 'ACTIVO') {
    return (
      <p className="text-sm mt-4" style={{ color: '#6b6459' }}>
        Tu tienda está pausada en el catálogo.{' '}
        <Link to={RUTA_SISTEMA_VISIBILIDAD} className="font-semibold" style={{ color: 'var(--hc-accent)' }}>
          Publicála
        </Link>
        {' '}para que este producto se vea.
      </p>
    )
  }
  return (
    <p className="text-sm mt-4" style={{ color: '#6b6459' }}>
      Cuando HotClick active tu negocio, este producto aparece en tu tienda
      {slug ? ` (/tienda/${slug})` : ''}. Mientras tanto queda en Sistema.
    </p>
  )
}

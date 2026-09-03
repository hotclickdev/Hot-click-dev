import { Link, useParams } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { productoPorId } from './mock'
import { Boton } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import EntradaPagina from './motion/EntradaPagina'

/**
 * Detalle público de producto (Figma 61:497).
 */
export default function ProductoDetallePage() {
  const { id } = useParams()
  const ruta = useSellerRuta()
  const producto = id ? productoPorId(id) : undefined
  if (!producto) {
    return (
      <main className="px-5 py-16">
        <EntradaPagina>
          <p className="text-sm text-hc-muted">No encontramos ese producto.</p>
          <Link to={ruta('tienda')} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-hc-accent">
            Volver a la tienda
          </Link>
        </EntradaPagina>
      </main>
    )
  }
  return (
    <main>
      <EntradaPagina>
        <div className="relative h-[280px] bg-hc-surface-2">
          <Link
            to={ruta('tienda')}
            className="absolute left-5 top-5 flex size-9 items-center justify-center rounded-full bg-hc-surface text-lg"
            aria-label="Volver"
          >
            ←
          </Link>
        </div>
        <div className="px-5 py-6">
          <span className="rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: 'var(--hc-red-50)', color: 'var(--hc-primary)' }}>
            {producto.categoria}
          </span>
          <h1 className="mt-3 font-display text-xl font-bold">{producto.nombre}</h1>
          <p className="mt-2 text-2xl font-bold">{formatoColon(producto.precio)}</p>
          <p className="mt-4 rounded-xl bg-hc-surface-2 px-3 py-2.5 text-sm">
            Vendido por <span className="font-medium">Tienda QA2 Emprendedor</span>
          </p>
          <h2 className="mt-5 text-sm font-semibold">Descripción</h2>
          <p className="mt-2 text-sm text-hc-muted">{producto.descripcion}</p>
          <div className="mt-6">
            <Boton to={ruta(`carrito?producto=${producto.id}`)}>Comprar ahora</Boton>
          </div>
        </div>
      </EntradaPagina>
    </main>
  )
}

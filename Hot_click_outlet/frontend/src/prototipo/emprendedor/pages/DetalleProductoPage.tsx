import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { formatoColon } from '@/theme/formatoColon'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import BadgeEstado from '../ui/BadgeEstado'
import BotonPrimario from '../ui/BotonPrimario'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { useCuentaVendedor } from '../hooks/useCuentaVendedor'

/**
 * Paso 8 Detalle de producto público (Figma 21:24).
 */
export default function DetalleProductoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { productos, cargando } = useCatalogoEmprendedor()
  const { tienda } = useCuentaVendedor()
  const producto = useMemo(() => productos.find((p) => p.id === id), [productos, id])

  if (cargando) {
    return (
      <main className="px-5 py-10">
        <p className="text-sm text-hc-muted">Cargando producto…</p>
      </main>
    )
  }

  if (!producto) {
    return (
      <main className="px-5 py-10">
        <EntradaPagina>
          <p className="text-sm text-hc-muted">Producto no encontrado.</p>
        </EntradaPagina>
      </main>
    )
  }

  return (
    <main>
      <EntradaPagina>
        <div className="relative h-[280px] bg-[var(--hc-n-100)]">
          {producto.imagenUrl ? (
            <img src={producto.imagenUrl} alt="" className="size-full object-cover" />
          ) : null}
          <button
            type="button"
            onClick={() => navigate(`${RUTA_EMPRENDEDOR}/tienda`)}
            className="absolute left-5 top-5 flex size-9 items-center justify-center rounded-full bg-hc-surface"
            aria-label="Volver"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 pb-10 pt-[22px]">
          <BadgeEstado>{producto.categoria}</BadgeEstado>
          <h1 className="font-display text-xl font-bold">{producto.nombre}</h1>
          <p className="text-2xl font-bold text-hc-primary">{formatoColon(producto.precio)}</p>
          <p className="rounded-xl bg-[var(--hc-n-50)] px-3 py-2.5 text-xs">
            <span className="text-hc-muted">Vendido por </span>
            <span className="font-bold">Tienda {tienda}</span>
          </p>
          <h2 className="text-sm font-bold">Descripción</h2>
          <p className="text-xs text-hc-muted">{producto.descripcion || 'Sin descripción.'}</p>
          <BotonPrimario onClick={() => navigate('/carrito')}>
            Comprar ahora
          </BotonPrimario>
        </div>
      </EntradaPagina>
    </main>
  )
}

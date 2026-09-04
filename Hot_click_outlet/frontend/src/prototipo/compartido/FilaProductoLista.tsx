import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { formatoColon } from '@/theme/formatoColon'
import { etiquetaPrecioProducto } from './personalizadoProductoHelpers'
import { Miniatura } from './ui'
import type { ProductoListaItem } from './productosListaHelpers'

type Props = Readonly<{
  producto: ProductoListaItem
  to: string
}>

/**
 * Fila de producto en Mis Productos (Emp + Seller).
 */
export default function FilaProductoLista({ producto, to }: Props) {
  const reduced = useReducedMotion() ?? false
  const precioLabel = etiquetaPrecioProducto(
    producto.esPersonalizado === true,
    producto.modoPrecioPersonalizado,
    producto.precio,
    producto.precioPersonalizadoMin,
    producto.precioPersonalizadoMax,
  )
  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -1 }}
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <Link to={to} className="flex items-center gap-3">
        {producto.imagenUrl ? (
          <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-[var(--hc-n-100)]">
            <img
              src={producto.imagenUrl}
              alt=""
              className="size-full object-cover"
              width={56}
              height={56}
            />
          </span>
        ) : (
          <Miniatura />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{producto.nombre}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Tag>{producto.categoria}</Tag>
            <span className="text-[13px] font-bold">
              {precioLabel ?? formatoColon(producto.precio)}
            </span>
            <EstadoBadge estado={producto.estado} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function Tag({ children }: { children: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-medium"
      style={{ background: 'var(--hc-red-50)', color: 'var(--hc-primary)' }}
    >
      {children}
    </span>
  )
}

function EstadoBadge({ estado }: { estado: ProductoListaItem['estado'] }) {
  const publicado = estado === 'Publicado'
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-medium"
      style={{
        background: publicado ? 'var(--hc-success-bg)' : 'var(--hc-warning-bg)',
        color: publicado ? 'var(--hc-success)' : 'var(--hc-warning)',
      }}
    >
      {estado}
    </span>
  )
}

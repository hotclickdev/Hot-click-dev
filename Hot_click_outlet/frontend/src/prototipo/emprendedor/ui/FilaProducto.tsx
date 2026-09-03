import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { formatoColon } from '@/theme/formatoColon'
import { etiquetaPrecioProducto } from '@/prototipo/compartido/personalizadoProductoHelpers'
import BadgeEstado from '../ui/BadgeEstado'
import Miniatura from '../ui/Miniatura'
import { RUTA_EMPRENDEDOR } from '../constants'
import type { ProductoEmprendedor } from '../types'

type Props = { producto: ProductoEmprendedor; to?: string }

/**
 * Fila de producto en Mis Productos (Figma 7:16).
 */
export default function FilaProducto({ producto, to }: Props) {
  const reduced = useReducedMotion() ?? false
  const destino = to ?? `${RUTA_EMPRENDEDOR}/productos/${producto.id}/editar`
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
      <Link to={destino} className="flex items-center gap-3">
        <Miniatura src={producto.imagenUrl} alt="" size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{producto.nombre}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <BadgeEstado>{producto.categoria}</BadgeEstado>
            <span className="text-[13px] font-bold">
              {precioLabel ?? formatoColon(producto.precio)}
            </span>
            <BadgeEstado tono={producto.estado === 'Publicado' ? 'exito' : 'alerta'}>
              {producto.estado}
            </BadgeEstado>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

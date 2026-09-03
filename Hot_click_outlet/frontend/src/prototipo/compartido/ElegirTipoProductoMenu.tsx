import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import TarjetaOpcion from './motion/TarjetaOpcion'
import { EASE_PREMIUM } from './motion/formularioMotionTokens'

const OPCIONES = [
  {
    path: 'catalogo',
    titulo: 'Producto de catálogo',
    ayuda: 'Precio fijo, stock y listo para vender (ropa, tech, etc.).',
  },
  {
    path: 'personalizado',
    titulo: 'Producto personalizado',
    ayuda: 'Por encargo: sin precio fijo; el cliente pide y vos cotizás después.',
  },
] as const

type Props = Readonly<{
  baseNuevo: string
  cabecera?: ReactNode
}>

/**
 * Primer paso al agregar: catálogo vs personalizado.
 */
export default function ElegirTipoProductoMenu({ baseNuevo, cabecera }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {cabecera}
      <p className="text-sm text-hc-muted">Elegí una opción para continuar.</p>
      <motion.div
        className="flex flex-col gap-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {OPCIONES.map((opcion) => (
          <motion.div
            key={opcion.path}
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_PREMIUM } },
            }}
          >
            <TarjetaOpcion
              to={`${baseNuevo}/${opcion.path}`}
              titulo={opcion.titulo}
              ayuda={opcion.ayuda}
              data-mm="seller-elegir-tipo-producto"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

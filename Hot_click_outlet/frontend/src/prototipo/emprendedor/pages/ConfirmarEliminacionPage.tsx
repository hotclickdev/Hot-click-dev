import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { borrarProductoVendedor, mensajeErrorProducto } from '@/prototipo/compartido/catalogoVendedorApi'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { EASE_PREMIUM } from '@/prototipo/compartido/motion/formularioMotionTokens'

/**
 * Paso 13 Confirmar eliminación (Figma 37:178).
 */
export default function ConfirmarEliminacionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { productos, cargando } = useCatalogoEmprendedor()
  const producto = useMemo(() => productos.find((item) => item.id === id), [productos, id])
  const nombre = producto?.nombre ?? 'este producto'
  const [error, setError] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const reduced = useReducedMotion() ?? false

  async function eliminar() {
    setEliminando(true)
    setError(null)
    try {
      await borrarProductoVendedor(id)
      navigate(`${RUTA_EMPRENDEDOR}/productos`)
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo eliminar el producto.'))
    } finally {
      setEliminando(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pb-16 pt-36 text-center">
      <EntradaPagina className="flex w-full max-w-sm flex-col items-center gap-4">
        <div className="flex size-20 items-center justify-center rounded-full bg-[var(--hc-danger-bg)] text-3xl font-bold text-hc-primary">
          !
        </div>
        <h1 className="font-display text-lg font-bold">¿Eliminar este producto?</h1>
        <p className="text-[13px] text-hc-muted">
          {cargando ? 'Cargando…' : `${nombre} se va a eliminar de tu catálogo. Esta acción no se puede deshacer.`}
        </p>
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        <div className="flex w-full flex-col gap-2">
          <motion.button
            type="button"
            disabled={eliminando || cargando}
            onClick={() => void eliminar()}
            className="flex min-h-11 w-full items-center justify-center rounded-[14px] bg-hc-primary px-4 py-3 text-sm font-bold text-white disabled:pointer-events-none disabled:opacity-50"
            whileHover={reduced || eliminando ? undefined : { y: -2 }}
            whileTap={reduced || eliminando ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE_PREMIUM }}
          >
            {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
          </motion.button>
          <motion.button
            type="button"
            disabled={eliminando}
            onClick={() => navigate(`${RUTA_EMPRENDEDOR}/productos/${id}/editar`)}
            className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface px-4 py-3 text-sm font-bold text-hc-text disabled:pointer-events-none disabled:opacity-40"
            whileHover={reduced || eliminando ? undefined : { y: -2 }}
            whileTap={reduced || eliminando ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE_PREMIUM }}
          >
            Cancelar
          </motion.button>
        </div>
      </EntradaPagina>
    </main>
  )
}

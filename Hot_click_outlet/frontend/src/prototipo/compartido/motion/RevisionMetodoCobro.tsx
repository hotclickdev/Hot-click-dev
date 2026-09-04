import { motion, useReducedMotion } from 'framer-motion'
import {
  mascaraDesdeDato,
  nombrePorTipo,
  type TipoMetodoCobro,
} from '../metodosCobroDatos'
import {
  DESPLAZAMIENTO_ITEM_PX,
  DURACION_ENTRADA_S,
  DURACION_REDUCED_S,
  EASE_PREMIUM,
  SPRING_ENTRADA,
  SPRING_POP,
} from './formularioMotionTokens'

type Props = Readonly<{
  tipo: TipoMetodoCobro
  dato: string
  onEditar?: () => void
}>

/**
 * Paso "Revisá los datos": máscara ••••-0000 y volver a editar.
 */
export default function RevisionMetodoCobro({ tipo, dato, onEditar }: Props) {
  const reduced = useReducedMotion() ?? false
  const delay = (segundos: number) => (reduced ? 0 : segundos)

  return (
    <motion.div
      className="rounded-xl border border-hc-border bg-hc-surface p-4"
      initial={reduced ? false : { opacity: 0, y: DESPLAZAMIENTO_ITEM_PX }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: DURACION_REDUCED_S }
          : { ...SPRING_ENTRADA, duration: DURACION_ENTRADA_S }
      }
    >
      <motion.div
        className="mb-3 flex size-10 items-center justify-center rounded-full bg-[var(--hc-success-bg)] text-lg font-bold text-[var(--hc-success)]"
        initial={reduced ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={reduced ? { duration: DURACION_REDUCED_S } : SPRING_POP}
        aria-hidden
      >
        ✓
      </motion.div>
      <motion.p
        className="text-sm font-semibold text-hc-text"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.08), duration: DURACION_ENTRADA_S, ease: EASE_PREMIUM }}
      >
        Revisá los datos
      </motion.p>
      <motion.p
        className="mt-1 text-sm text-hc-text"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.12), duration: DURACION_ENTRADA_S, ease: EASE_PREMIUM }}
      >
        {nombrePorTipo(tipo)}
      </motion.p>
      <motion.p
        className="mt-1 font-mono text-[13px] text-hc-text"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.16), duration: DURACION_ENTRADA_S, ease: EASE_PREMIUM }}
      >
        {mascaraDesdeDato(tipo, dato)}
      </motion.p>
      <motion.p
        className="mt-2 text-xs text-hc-muted"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.2), duration: DURACION_ENTRADA_S, ease: EASE_PREMIUM }}
      >
        Se guarda en tu negocio para recibir ingresos de ventas.
      </motion.p>
      {onEditar ? (
        <button
          type="button"
          onClick={onEditar}
          className="mt-3 text-[13px] font-medium text-[var(--hc-info)]"
        >
          Editar datos
        </button>
      ) : null}
    </motion.div>
  )
}

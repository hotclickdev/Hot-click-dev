import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import PubRow from './PubRow'
import { FILTROS_ESTADO_COLA, type PublicacionFb } from './publicacionesHelpers'
import TextoMas from '@/components/ui/TextoMas'
import type { Id } from '@/types/api'

type ColaTabProps = {
  filtroEstado: string
  onFiltroEstado: (estado: string) => void
  onActualizar: () => void
  onAgregar: () => void
  loading: boolean
  publicaciones: PublicacionFb[]
  onPublicado: (id: Id) => void
  onEliminar: (id: Id) => void
}

export default function ColaTab({
  filtroEstado,
  onFiltroEstado,
  onActualizar,
  onAgregar,
  loading,
  publicaciones,
  onPublicado,
  onEliminar,
}: ColaTabProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {FILTROS_ESTADO_COLA.map((e) => (
          <button type="button"
            key={e}
            onClick={() => onFiltroEstado(e)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filtroEstado === e
                ? 'bg-hc-primary/20 text-hc-link border border-hc-primary/30'
                : 'bg-hc-surface-2 text-hc-muted border border-hc-border hover:text-hc-text'
            }`}
          >
            {e || 'Todos'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button type="button"
            onClick={onActualizar}
            className="px-3 py-1 rounded-full text-xs text-hc-muted hover:text-hc-text border border-hc-border hover:bg-hc-surface-2 transition-colors"
          >
            Actualizar
          </button>
          <button type="button"
            onClick={onAgregar}
            className="px-3 py-1 rounded-full text-xs font-medium bg-hc-primary/15 text-hc-link border border-hc-primary/30 hover:bg-hc-primary/25 transition-colors inline-flex items-center"
          >
            <TextoMas>Agregar a la cola</TextoMas>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : publicaciones.length === 0 ? (
        <div className="text-center py-12 text-hc-muted text-sm">
          No hay publicaciones{filtroEstado ? ` con estado ${filtroEstado}` : ''}.
          <br />
          <span className="text-xs mt-1 block">
            Haz clic en «Agregar a la cola» para seleccionar productos del catálogo.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {publicaciones.map((pub) => (
            <PubRow
              key={pub.id}
              pub={pub}
              onPublicado={onPublicado}
              onEliminar={onEliminar}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

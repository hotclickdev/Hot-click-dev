import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import PubRow from './PubRow'
import { FILTROS_ESTADO_COLA } from './publicacionesHelpers'
import TextoMas from '@/components/ui/TextoMas'

export default function ColaTab({
  filtroEstado,
  onFiltroEstado,
  onActualizar,
  onAgregar,
  loading,
  publicaciones,
  onPublicado,
  onEliminar,
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {FILTROS_ESTADO_COLA.map((e) => (
          <button type="button"
            key={e}
            onClick={() => onFiltroEstado(e)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filtroEstado === e
                ? 'bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30'
                : 'bg-white/5 text-[#8e8e9a] border border-white/10 hover:text-white'
            }`}
          >
            {e || 'Todos'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button type="button"
            onClick={onActualizar}
            className="px-3 py-1 rounded-full text-xs text-[#8e8e9a] hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
          >
            Actualizar
          </button>
          <button type="button"
            onClick={onAgregar}
            className="px-3 py-1 rounded-full text-xs font-medium bg-[#4f7cff]/15 text-[#4f7cff] border border-[#4f7cff]/30 hover:bg-[#4f7cff]/25 transition-colors inline-flex items-center"
          >
            <TextoMas>Agregar a la cola</TextoMas>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : publicaciones.length === 0 ? (
        <div className="text-center py-12 text-[#8e8e9a] text-sm">
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

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import { ESTADO_COLOR } from './publicacionesHelpers'

export default function PubRow({ pub, onCopiar, onPublicado, onEliminar }) {
  const [expanded, setExpanded] = useState(false)
  const toast = useToast()

  const copiar = () => {
    navigator.clipboard.writeText(pub.textoFb ?? '').then(() =>
      toast({ message: 'Texto copiado al portapapeles', type: 'success' })
    )
    onCopiar?.(pub)
  }

  return (
    <div className="rounded-xl bg-white/3 border border-white/8 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#e8e8ed] truncate">
              {pub.tituloFb ?? pub.producto?.nombreProducto ?? `Producto #${pub.fkIdProducto}`}
            </span>
            <Badge variant={ESTADO_COLOR[pub.estadoPublicacion] ?? 'default'}>
              {pub.estadoPublicacion}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-[#8e8e9a]">
            {pub.precioPublicar && <span>{formatPrice(pub.precioPublicar)}</span>}
            {pub.condicionFb && <span>· {pub.condicionFb}</span>}
            {pub.categoriaFb && <span>· {pub.categoriaFb}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button"
            onClick={() => setExpanded((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg text-xs text-[#8e8e9a] hover:text-white hover:bg-white/8 transition-colors border border-white/10"
          >
            {expanded ? 'Ocultar' : 'Ver texto'}
          </button>
          {pub.estadoPublicacion !== 'PUBLICADO' && (
            <>
              <button type="button"
                onClick={copiar}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-[#4f7cff]/15 text-[#4f7cff] hover:bg-[#4f7cff]/25 transition-colors border border-[#4f7cff]/20"
              >
                Copiar
              </button>
              <button type="button"
                onClick={() => onPublicado(pub.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors border border-green-500/20"
              >
                Publicado
              </button>
            </>
          )}
          <button type="button"
            onClick={() => onEliminar(pub.id)}
            className="p-1.5 rounded-lg text-[#8e8e9a] hover:text-red-400 hover:bg-red-500/8 transition-colors"
            title="Eliminar"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && pub.textoFb && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/8 pt-3">
              <pre className="text-xs text-[#c8c8d0] whitespace-pre-wrap font-sans leading-relaxed bg-black/20 rounded-xl p-4">
                {pub.textoFb}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { motion, AnimatePresence } from 'framer-motion'

export default function AnalisisProgress({ previews, currentIdx }: { previews: string[]; currentIdx: number }) {
  const total = previews.length
  const progress = total > 0 ? Math.round((currentIdx / total) * 100) : 0
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.25 }}
          className="relative rounded-2xl overflow-hidden aspect-video flex items-center justify-center"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
          {previews[currentIdx] && (
            <img src={previews[currentIdx]} alt={`Imagen ${currentIdx + 1}`} className="max-h-72 max-w-full object-contain" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              <span className="text-sm font-medium text-white">
                {currentIdx === 0 ? 'Analizando con Vision AI…' : `Procesando imagen ${currentIdx + 1}…`}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--hc-muted)' }}>
        <span>Imagen {currentIdx + 1} de {total}</span><span>{progress}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        <motion.div className="h-full rounded-full" style={{ backgroundColor: 'var(--hc-accent)' }} initial={{ width: 0 }}
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {previews.map((src, idx) => (
          <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all"
            style={estiloThumbAnalisis(idx, currentIdx)}>
            <img src={src} alt="" className="w-full h-full object-cover" />
            {idx < currentIdx && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function estiloThumbAnalisis(idx: number, currentIdx: number) {
  if (idx < currentIdx) return { borderColor: 'rgba(30,127,79,0.7)', opacity: 0.6 }
  if (idx === currentIdx) return { borderColor: 'var(--hc-accent)', transform: 'scale(1.1)' }
  return { borderColor: 'var(--hc-border)', opacity: 0.3 }
}

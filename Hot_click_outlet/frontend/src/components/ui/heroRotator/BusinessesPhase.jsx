import { motion } from 'framer-motion'

/** Hasta 2 emprendimientos con convenio en el hero. */
export function BusinessesPhase({ convenios, accent }) {
  const items = (convenios ?? []).slice(0, 2)

  return (
    <motion.div
      key="businesses"
      initial={{ opacity: 1, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl mx-auto px-4"
    >
      <div className="text-center mb-8">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: accent }}>
          Aliados HotClick
        </p>
        <h2 className="font-black tracking-tight" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', color: 'var(--hc-text)', lineHeight: 1.1 }}>
          Emprendimientos con convenio
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="flex gap-6 justify-center">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 max-w-xs rounded-2xl overflow-hidden animate-pulse"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div className="h-32" style={{ background: 'var(--hc-border)' }} />
              <div className="p-5 space-y-2">
                <div className="h-3 rounded" style={{ background: 'var(--hc-border)', width: '60%' }} />
                <div className="h-3 rounded" style={{ background: 'var(--hc-border)', width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          {items.map((c, i) => (
            <motion.div
              key={c.id ?? i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -5, boxShadow: `0 16px 40px rgba(0,0,0,0.13)` }}
              className="flex-1 max-w-sm rounded-2xl overflow-hidden transition-all"
              style={{ background: 'var(--hc-surface)', border: `1px solid color-mix(in srgb, ${accent} 13%, transparent)` }}
            >
              <div className="h-28 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 9%, transparent), color-mix(in srgb, ${accent} 3%, transparent))` }}>
                {c.logoUrl ? (
                  <img src={c.logoUrl} alt={c.nombre}
                    className="max-h-16 max-w-[70%] object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
                    style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
                    {(c.nombre ?? '?')[0].toUpperCase()}
                  </div>
                )}
              </div>

              <div className="p-5">
                <p className="font-bold text-base mb-1" style={{ color: 'var(--hc-text)' }}>{c.nombre}</p>
                {c.descripcion && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--hc-muted)' }}>
                    {c.descripcion}
                  </p>
                )}
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: accent }}>
                  Convenio activo
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

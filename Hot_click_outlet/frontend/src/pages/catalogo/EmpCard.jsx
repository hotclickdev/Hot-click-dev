import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatPrice } from '@/utils/format'

// ── Emprendimientos ───────────────────────────────────────────────────────────
export default function EmpCard({ p, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      whileHover={{ y: -4 }} className="relative rounded-2xl overflow-hidden cursor-pointer group hc-card"
      style={{ boxShadow: '0 2px 16px rgba(16,185,129,0.08)' }}
    >
      <Link to={`/productos/${p.id}`}>
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black"
          style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
          🤝 Local
        </div>
        <div className="aspect-square overflow-hidden"
          style={{ background: 'color-mix(in srgb, #10b981 7%, var(--hc-surface))' }}>
          {p.imagenUrl
            ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full flex items-center justify-center opacity-30 text-5xl">🌿</div>
          }
        </div>
        <div className="p-4">
          {p.marcaNombre && (
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10b981' }}>
              {p.marcaNombre}
            </p>
          )}
          <p className="text-sm font-semibold line-clamp-2 mb-3" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
          <p className="text-xl font-black" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
            {formatPrice(p.precio)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

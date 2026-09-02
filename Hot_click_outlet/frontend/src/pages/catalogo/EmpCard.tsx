import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { textoPrecioProducto } from '@/utils/precioProducto'
import type { Producto } from '@/types/producto'

function IconLocal() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

export default function EmpCard({ p, i }: { p: Producto; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      whileHover={{ y: -4 }} className="relative rounded-2xl overflow-hidden cursor-pointer group hc-card"
      style={{ boxShadow: '0 2px 16px rgba(16,185,129,0.08)' }}
    >
      <Link to={`/productos/${p.id}`}>
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black"
          style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
          <IconLocal />
          Local
        </div>
        <div className="aspect-square overflow-hidden"
          style={{ background: 'color-mix(in srgb, #10b981 7%, var(--hc-surface))' }}>
          {p.imagenUrl
            ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--hc-muted)' }}>
                <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
        </div>
        <div className="p-4">
          {p.marcaNombre && (
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10b981' }}>
              {p.marcaNombre}
            </p>
          )}
          <p className="text-sm font-semibold line-clamp-2 mb-3" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
          <p className="text-xl font-black" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
            {textoPrecioProducto(p)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

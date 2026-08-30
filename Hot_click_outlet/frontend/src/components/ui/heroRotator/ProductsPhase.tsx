import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { Producto } from '@/types/producto'

export type ProductsPhaseProps = {
  productos?: Producto[]
  accent: string
}

/** Carrusel de hasta 3 productos destacados del hero. */
export function ProductsPhase({ productos, accent }: ProductsPhaseProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items = (productos ?? []).slice(0, 3)

  return (
    <motion.div
      key="products"
      initial={{ opacity: 1, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl mx-auto px-4"
    >
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: accent }}>
            {t('home.featuredKicker')}
          </p>
          <h2 className="font-black tracking-tight" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', color: 'var(--hc-text)', lineHeight: 1.1 }}>
            {t('home.destacados')}
          </h2>
        </div>
        <Link to="/productos"
          className="text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0"
          style={{ color: accent }}>
          {t('home.verTodosProductos')}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:mx-0 sm:px-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shrink-0 w-[70vw] sm:w-auto rounded-2xl overflow-hidden animate-pulse"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div className="aspect-[4/3]" style={{ background: 'var(--hc-border)' }} />
              <div className="p-4 space-y-2">
                <div className="h-3 rounded" style={{ background: 'var(--hc-border)', width: '70%' }} />
                <div className="h-4 rounded" style={{ background: 'var(--hc-border)', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:mx-0 sm:px-0 sm:snap-none">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, boxShadow: `0 12px 32px rgba(0,0,0,0.12)` }}
              onClick={() => navigate(`/productos/${p.id}`)}
              className="shrink-0 w-[70vw] snap-center sm:w-auto rounded-2xl overflow-hidden cursor-pointer group transition-all"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <div className="overflow-hidden" style={{ background: 'var(--hc-border)', aspectRatio: '4/3' }}>
                {p.imagenUrl ? (
                  <img src={p.imagenUrl} alt={p.nombre}
                    width="400" height="300"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-30" style={{ color: 'var(--hc-muted)' }}>
                    <TrustGlyph tipo="paquete" className="w-12 h-12" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                <p className="text-xl font-black mt-1" style={{ color: accent }}>{formatPrice(p.precio)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

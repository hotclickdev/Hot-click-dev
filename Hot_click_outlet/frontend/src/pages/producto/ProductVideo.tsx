import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { detectVideo } from './productoHelpers'
import type { TipoVideo } from './productoHelpers'
import type { Producto } from '@/types/producto'

const VIDEO_ICONOS: Record<TipoVideo, { bg: string; border: string; color: string; d: string }> = {
  youtube:   { bg: 'bg-red-500/15', border: 'border-red-500/25', color: 'text-red-400', d: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  tiktok:    { bg: 'bg-hc-surface-2', border: 'border-hc-border', color: 'text-hc-text', d: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z' },
  instagram: { bg: 'bg-pink-500/15', border: 'border-pink-500/25', color: 'text-pink-400', d: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
}

export default function ProductVideo({ product }: { product: Producto }) {
  const { t } = useTranslation()
  const vid = detectVideo(product.videoUrl)
  if (!vid) return null

  const ic = VIDEO_ICONOS[vid.type]
  const isTikTok = vid.type === 'tiktok'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-6 sm:mt-12"
    >
      <h2 className="text-lg font-bold text-hc-text mb-4 flex items-center gap-2">
        <span className={`w-7 h-7 rounded-lg ${ic.bg} border ${ic.border} flex items-center justify-center shrink-0`}>
          <svg className={`w-3.5 h-3.5 ${ic.color}`} viewBox="0 0 24 24" fill="currentColor">
            <path d={ic.d} />
          </svg>
        </span>
        {t('product.videoTitle')}
      </h2>
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-black border border-hc-border"
        style={isTikTok ? { paddingBottom: '177.77%', maxWidth: '340px', margin: '0 auto' } : { paddingBottom: '56.25%' }}
      >
        <iframe
          src={vid.embedUrl}
          title={`Video de ${product.titulo || product.nombre}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </motion.div>
  )
}

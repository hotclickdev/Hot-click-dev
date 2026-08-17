import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'

/** Pantalla final: likes, agregar al carrito y atajos. */
export default function DescubriDone({ liked, onAddAll, onRestart }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="text-center"
    >
      <h2 className="text-lg font-bold mt-6 mb-1" style={{ color: 'var(--hc-text)' }}>
        {liked.length > 0
          ? t('descubri.doneTitle', { count: liked.length })
          : t('descubri.doneEmptyTitle')}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>
        {liked.length > 0 ? t('descubri.doneSub') : t('descubri.doneEmptySub')}
      </p>

      {liked.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6 text-left">
          {liked.map((p) => (
            <Link
              key={p.id}
              to={`/productos/${p.id}`}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <div className="bg-white h-20 flex items-center justify-center p-2">
                <img src={p.imagenUrl} alt={p.nombre} className="max-h-full max-w-full object-contain" loading="lazy" />
              </div>
              <div className="p-2">
                <p className="text-[11px] leading-tight line-clamp-2" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--hc-accent)' }}>{formatPrice(p.precio)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {liked.some((p) => p.stock > 0) && (
          <button type="button"
            onClick={onAddAll}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'var(--hc-accent)' }}
          >
            {t('descubri.addAll')}
          </button>
        )}
        <Link
          to="/productos?sort=para_vos"
          className="w-full py-3 rounded-xl text-sm font-semibold text-center"
          style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          {t('descubri.catalogByTaste')}
        </Link>
        <button type="button"
          onClick={onRestart}
          className="text-xs mt-1"
          style={{ color: 'var(--hc-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t('descubri.restart')}
        </button>
      </div>
    </motion.div>
  )
}

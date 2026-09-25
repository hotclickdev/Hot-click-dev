import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { PLAN_EMPRENDEDOR } from './emprendePrecios'

/** Hero de /emprende. Visitante ve la propuesta completa; dueño ya logueado ve una versión corta. */
export default function EmprendeHero({ yaEsDuenio }: { yaEsDuenio: boolean }) {
  const { t } = useTranslation()

  if (yaEsDuenio) {
    return (
      <header className="mb-10">
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--hc-primary)' }}>
          {t('emprende.badge')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--hc-text)' }}>
          {t('emprende.titleOwner')}
        </h1>
        <p className="text-base max-w-xl leading-relaxed mb-5" style={{ color: 'var(--hc-muted)' }}>
          {t('emprende.subOwner')}
        </p>
      </header>
    )
  }

  return (
    <header className="mb-2">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5"
        style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
      >
        {t('emprende.heroBadge')}
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="text-4xl sm:text-5xl font-bold leading-[1.08] mb-4 max-w-3xl"
        style={{ color: 'var(--hc-text)', fontFamily: 'var(--hc-font-display)' }}
      >
        {t('emprende.title')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-lg leading-relaxed mb-4 max-w-xl"
        style={{ color: 'var(--hc-muted)' }}
      >
        {t('emprende.sub')}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="text-sm mb-6"
        style={{ color: 'var(--hc-primary)', fontFamily: 'var(--hc-font-mono)' }}
      >
        {t('emprende.heroPrecioLinea', {
          comision: PLAN_EMPRENDEDOR.comisionPct,
          minimo: PLAN_EMPRENDEDOR.minimoColones,
        })}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Link
          to="/registro-empresa"
          className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold min-h-[44px] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          {t('emprende.ctaCrear')}
        </Link>
      </motion.div>
    </header>
  )
}

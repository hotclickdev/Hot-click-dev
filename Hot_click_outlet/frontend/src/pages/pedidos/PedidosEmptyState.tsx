import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'

export default function PedidosEmptyState({ onVerProductos }: { onVerProductos: () => void }) {
  const { t } = useTranslation()
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="text-center py-16 rounded-2xl border"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>
      <svg className="w-12 h-12 mx-auto opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="mt-4 font-medium" style={{ color: 'var(--hc-text)' }}>{t('orders.empty')}</p>
      <p className="text-sm mt-1 mb-6" style={{ color: 'var(--hc-muted)' }}>{t('orders.emptySub')}</p>
      <Button onClick={onVerProductos}>{t('orders.viewProducts')}</Button>
    </motion.div>
  )
}

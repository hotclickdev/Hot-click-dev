import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { SalesDay } from './dashboardHelpers'

type SalesChartProps = {
  salesLast7: SalesDay[]
}

export default function SalesChart({ salesLast7 }: SalesChartProps) {
  const { t } = useTranslation()
  const maxSale = Math.max(...salesLast7.map((d) => d.total), 1)

  return (
    <div className="bg-[var(--hc-surface)] border border-[var(--hc-border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--hc-text)]">{t('admin.dashboard.revenue')}</h2>
          <p className="text-xs text-[var(--hc-muted)] mt-0.5">Últimos 7 días (completadas)</p>
        </div>
        <Link to="/admin/reportes" className="text-xs text-[var(--hc-link)] hover:underline">
          <TextoFlecha>Ver reportes</TextoFlecha>
        </Link>
      </div>
      <div className="flex items-end gap-2 h-40">
        {salesLast7.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span
              className="text-[9px] text-[var(--hc-muted)] text-center leading-tight"
              style={{ minHeight: '22px' }}
            >
              {d.total > 0 ? formatPrice(d.total) : ''}
            </span>
            <div className="w-full relative flex items-end" style={{ height: '100px' }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{
                  height: `${Math.max((d.total / maxSale) * 100, d.total > 0 ? 6 : 2)}px`,
                }}
                transition={{ duration: 0.55, delay: i * 0.06 }}
                className="w-full rounded-t-lg"
                style={{
                  background: d.total > 0
                    ? 'linear-gradient(to top, #4f7cff, #7fa0ff)'
                    : 'var(--hc-surface-2)',
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--hc-muted)] capitalize">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

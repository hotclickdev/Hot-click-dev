import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

type PaymentMethodsProps = {
  byMethod: [string, number][]
  completadas: number
  pendientes: number
  ventasCount: number
  titulo?: string
  vacio?: string
  etiquetaConteo?: string
}

export default function PaymentMethods({
  byMethod,
  completadas,
  pendientes,
  ventasCount,
  titulo = 'Métodos de pago',
  vacio,
  etiquetaConteo = 'ventas',
}: PaymentMethodsProps) {
  const { t } = useTranslation()
  const maxMethod = byMethod[0]?.[1] ?? 1
  const estados = [
    { label: 'Completadas', count: completadas, color: 'bg-emerald-500' },
    { label: 'Pendientes', count: pendientes, color: 'bg-amber-500' },
    { label: 'Otras', count: ventasCount - completadas - pendientes, color: 'bg-white/20' },
  ].filter((s) => s.count > 0)

  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-[#e8e8ed] mb-4">{titulo}</h2>
      {byMethod.length === 0 ? (
        <p className="text-xs text-[#8e8e9a] text-center py-8">{vacio ?? t('common.noData')}</p>
      ) : (
        <div className="space-y-3">
          {byMethod.map(([method, count]) => (
            <div key={method}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#e8e8ed]">{method}</span>
                <span className="text-[#8e8e9a]">{count} {etiquetaConteo}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxMethod) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: 'var(--hc-link)' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-white/8">
        <h3 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider mb-3">
          Estado ventas
        </h3>
        <div className="space-y-2">
          {estados.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
              <span className="text-xs text-[#8e8e9a] flex-1">{s.label}</span>
              <span className="text-xs font-medium text-[#e8e8ed]">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

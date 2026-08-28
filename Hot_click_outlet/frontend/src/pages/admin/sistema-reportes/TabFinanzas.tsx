import { motion } from 'framer-motion'
import { formatPrice } from '@/utils/format'
import { CARD_SHADOW, capitalizar, type DiaConTotal } from './sistemaReportesHelpers'

export default function TabFinanzas({ porDia, totalSemana, maxDia, mejorDia, mejorDiaPct, ingresoNeto, costoSemana }: {
  porDia: DiaConTotal[]
  totalSemana: number
  maxDia: number
  mejorDia: DiaConTotal
  mejorDiaPct: number
  ingresoNeto: number
  costoSemana: number
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 rounded-2xl p-6 flex flex-col gap-4" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
        <div className="flex items-center justify-between">
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--hc-text)' }}>Ventas de la semana</h2>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>{formatPrice(totalSemana)}</span>
        </div>
        <div className="flex items-end gap-3.5 h-44">
          {porDia.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((d.total / maxDia) * 100, d.total > 0 ? 6 : 2)}px` }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="w-full rounded-t-md"
                style={{ backgroundColor: d.iso === mejorDia.iso && d.total > 0 ? 'var(--hc-accent)' : '#cdd9ef' }}
              />
              <span style={{ fontSize: 12, color: '#8a8378', fontWeight: d.iso === mejorDia.iso ? 700 : 400 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl p-5 flex flex-col gap-1.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>Ingreso neto de la semana</h3>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--hc-text)' }}>{formatPrice(ingresoNeto)}</div>
          {costoSemana > 0 && <p style={{ fontSize: 13, color: '#1E7F4F', fontWeight: 600, margin: 0 }}>Después de {formatPrice(costoSemana)} en costos</p>}
        </div>
        <div className="rounded-2xl p-5 flex flex-col gap-1.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>Mejor día para vender</h3>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--hc-text)' }}>{capitalizar(mejorDia.labelLargo)}</div>
          {totalSemana > 0 && <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: 0 }}>{mejorDiaPct}% de tus ventas de la semana</p>}
        </div>
      </div>
    </div>
  )
}

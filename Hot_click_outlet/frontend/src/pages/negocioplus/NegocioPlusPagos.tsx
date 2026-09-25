import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'

function Chip({ icon, label, rotate = '' }: { icon: string; label: string; rotate?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border bg-white pl-3 pr-3.5 py-2.5 shadow-[0px_8px_16px_0px_rgba(10,20,46,0.14)] ${rotate}`}
      style={{ borderColor: 'var(--hc-n-200)' }}
    >
      <span style={{ color: 'var(--hc-blue-600)' }}>
        <TrustGlyph tipo={icon} className="w-4 h-4 shrink-0" />
      </span>
      <span className="text-[13px] whitespace-nowrap" style={{ color: '#14171c' }}>{label}</span>
    </div>
  )
}

function SucursalCard({ nombre, monto, rotate = '' }: { nombre: string; monto: string; rotate?: string }) {
  return (
    <div
      className={`w-32 rounded-xl border bg-white p-2.5 shadow-[0px_10px_18px_0px_rgba(10,20,46,0.14)] ${rotate}`}
      style={{ borderColor: 'var(--hc-n-200)' }}
    >
      <div className="h-16 rounded-lg mb-2" style={{ backgroundColor: '#eef1f5' }} />
      <p className="text-xs font-semibold" style={{ color: '#14171c' }}>{nombre}</p>
      <p className="text-[11px]" style={{ color: 'rgba(20,23,28,0.6)', fontFamily: 'var(--hc-font-mono)' }}>{monto}</p>
    </div>
  )
}

/**
 * "Tus clientes pagan como quieran": composición del Figma reinterpretada
 * con layout flex/relative en vez de posicionamiento absoluto pixel a pixel
 * (la ilustración original es puramente decorativa).
 */
export default function NegocioPlusPagos() {
  const { t } = useTranslation()

  return (
    <section className="scroll-mt-24 py-10 sm:py-14 border-t" style={{ borderColor: 'var(--hc-border)' }}>
      <div className="flex flex-col items-center gap-3 text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--hc-text)' }}>
          {t('negocioPlus.pagosTitle')}
        </h2>
        <p className="text-sm sm:text-base max-w-xl leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          {t('negocioPlus.pagosSub')}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-wrap items-center justify-center gap-6 rounded-2xl px-6 py-10"
        style={{ backgroundColor: '#eff4fe' }}
      >
        <SucursalCard nombre="Sucursal Centro" monto="₡320k" rotate="rotate-3" />

        <div className="flex flex-col items-center gap-3">
          <Chip icon="reloj" label={t('negocioPlus.pagosAprobacionSegundos')} rotate="-rotate-2" />
          <div
            className="w-[190px] rounded-[20px] border-8 bg-white flex flex-col items-center gap-2.5 px-4 py-5"
            style={{ borderColor: '#14171c' }}
          >
            <span
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-blue-600)' }}
            >
              <TrustGlyph tipo="check" className="w-6 h-6" />
            </span>
            <p className="text-sm font-semibold text-center" style={{ color: '#14171c' }}>{t('negocioPlus.pagosAprobado')}</p>
            <p className="text-[13px]" style={{ color: 'var(--hc-blue-600)', fontFamily: 'var(--hc-font-mono)' }}>₡24.900</p>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px]" style={{ backgroundColor: '#f1f3f6', color: 'rgba(20,23,28,0.6)' }}>
              {t('negocioPlus.pagosSinpeVerificado')}
            </span>
          </div>
          <Chip icon="tarjeta" label={t('negocioPlus.pagosVisa')} rotate="rotate-2" />
          <Chip icon="campana" label={t('negocioPlus.pagosNuevaVenta')} rotate="-rotate-1" />
        </div>

        <SucursalCard nombre="Sucursal Norte" monto="₡410k" rotate="-rotate-3" />

        <div className="flex flex-col gap-3">
          <Chip icon="rayo" label={t('negocioPlus.pagosTarjetaMinutos')} rotate="rotate-1" />
        </div>
      </motion.div>
    </section>
  )
}

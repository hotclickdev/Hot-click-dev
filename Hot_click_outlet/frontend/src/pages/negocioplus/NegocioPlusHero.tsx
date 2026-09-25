import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { PLAN_LANDING_COPY } from '../planes/planLandingCopy'

const copy = PLAN_LANDING_COPY.plus
const destino = `/registro-empresa?plan=${copy.query}`

type Sucursal = { nombreKey: string; detalleKey: string; monto: string }

const SUCURSALES: Sucursal[] = [
  { nombreKey: 'panelSucursalCentro', detalleKey: 'panelSucursalCentroDetalle', monto: '₡320k' },
  { nombreKey: 'panelSucursalNorte', detalleKey: 'panelSucursalNorteDetalle', monto: '₡410k' },
  { nombreKey: 'panelSucursalSur', detalleKey: 'panelSucursalSurDetalle', monto: '₡150k' },
]

/** Hero de /negocio-plus-plan: mensaje ejecutivo (fondo oscuro) + preview del panel multi-sucursal. */
export default function NegocioPlusHero() {
  const { t } = useTranslation()

  return (
    <header className="grid lg:grid-cols-2 rounded-b-[16px] overflow-hidden lg:rounded-[16px] lg:mx-4 sm:lg:mx-6 lg:mt-4">
      <div className="flex flex-col items-start justify-center gap-5 px-6 py-14 sm:px-10 sm:py-20" style={{ backgroundColor: '#0e1b33' }}>
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: 'var(--hc-blue-600)', color: '#fff' }}
        >
          {t('negocioPlus.heroBadge')}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl sm:text-[44px] font-bold leading-[1.1] max-w-xl text-white"
          style={{ fontFamily: 'var(--hc-font-display)' }}
        >
          {copy.headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-base sm:text-[17px] leading-relaxed max-w-md"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {copy.subheadline}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-sm"
          style={{ color: '#7aa3f2', fontFamily: 'var(--hc-font-mono)' }}
        >
          {copy.precio}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Link
            to={destino}
            className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg text-sm font-semibold min-h-[48px] bg-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ color: '#0e1b33' }}
          >
            {t('negocioPlus.heroCta')}
          </Link>
        </motion.div>
      </div>

      <div className="flex items-center justify-center p-8 sm:p-14" style={{ backgroundColor: '#fff' }}>
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-[460px] rounded-lg border overflow-hidden shadow-[0px_20px_40px_0px_rgba(10,20,46,0.16)]"
          style={{ borderColor: 'var(--hc-n-200)', backgroundColor: '#fff' }}
        >
          <div className="flex gap-1.5 px-3.5 py-2.5" style={{ backgroundColor: '#eef1f5' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d7dde6' }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d7dde6' }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d7dde6' }} />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex gap-2 w-full">
              <StatChip valor="3" labelKey="panelSucursales" />
              <StatChip valor="48" labelKey="panelPedidosHoy" />
              <StatChip valor="9" labelKey="panelUsuarios" />
            </div>
            {SUCURSALES.map((s) => (
              <div key={s.nombreKey} className="flex items-center gap-2.5 py-2 w-full">
                <span className="w-8 h-8 rounded-md shrink-0" style={{ backgroundColor: '#eef1f5' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: '#14171c' }}>{t(`negocioPlus.${s.nombreKey}`)}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(20,23,28,0.55)' }}>{t(`negocioPlus.${s.detalleKey}`)}</p>
                </div>
                <p className="text-xs shrink-0" style={{ color: 'var(--hc-blue-600)', fontFamily: 'var(--hc-font-mono)' }}>{s.monto}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </header>
  )
}

function StatChip({ valor, labelKey }: { valor: string; labelKey: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex-1 flex flex-col gap-0.5 px-3.5 py-3 rounded-md" style={{ backgroundColor: '#eef1f5' }}>
      <p className="text-lg font-bold" style={{ color: '#14171c' }}>{valor}</p>
      <p className="text-[11px]" style={{ color: 'rgba(20,23,28,0.6)' }}>{t(`negocioPlus.${labelKey}`)}</p>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'
import EmprendeSeccion from '../emprende/EmprendeSeccion'

function BarraVentana() {
  return (
    <div className="flex gap-1.5 px-3.5 py-2.5" style={{ backgroundColor: '#eef1f5' }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d7dde6' }} />
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d7dde6' }} />
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d7dde6' }} />
    </div>
  )
}

const TARJETAS = ['pos', 'inventario', 'telegram'] as const

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Tres previews del panel de Negocio Plus: POS multi-sucursal, inventario, avisos por Telegram. */
export default function NegocioPlusPanelPreview() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion title={t('negocioPlus.panelControlTitle')}>
      <div className="grid sm:grid-cols-3 gap-7">
        {TARJETAS.map((tipo, i) => (
          <motion.div
            key={tipo}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex flex-col gap-3.5"
          >
            <div
              className="rounded-lg border overflow-hidden shadow-[0px_10px_22px_0px_rgba(10,20,46,0.12)]"
              style={{ borderColor: 'var(--hc-n-200)', backgroundColor: '#fff' }}
            >
              <BarraVentana />
              <div className="p-4">
                {tipo === 'pos' ? <PreviewPos /> : null}
                {tipo === 'inventario' ? <PreviewInventario /> : null}
                {tipo === 'telegram' ? <PreviewTelegram /> : null}
              </div>
            </div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--hc-text)' }}>
              {t(`negocioPlus.panel${capitalize(tipo)}Titulo`)}
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
              {t(`negocioPlus.panel${capitalize(tipo)}Desc`)}
            </p>
          </motion.div>
        ))}
      </div>
    </EmprendeSeccion>
  )
}

function PreviewPos() {
  return (
    <div className="flex flex-col gap-2 text-[13px]" style={{ color: '#14171c' }}>
      <div className="flex justify-between"><span>Sucursal Centro x3</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.6)' }}>₡24.900</span></div>
      <div className="flex justify-between"><span>Sucursal Norte x1</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.6)' }}>₡14.200</span></div>
      <div className="flex justify-between pt-[10px] border-t font-semibold" style={{ borderColor: 'var(--hc-n-200)' }}>
        <span>Total</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'var(--hc-blue-600)' }}>₡39.100</span>
      </div>
      <span className="mt-1 py-2.5 rounded-md text-center text-white text-[13px] font-semibold" style={{ backgroundColor: 'var(--hc-blue-600)' }}>Cobrar</span>
    </div>
  )
}

function PreviewInventario() {
  return (
    <div className="flex flex-col gap-2.5 text-[13px]" style={{ color: '#14171c' }}>
      <div className="flex justify-between"><span>Camiseta básica — Centro</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.6)' }}>40 unid.</span></div>
      <div className="flex justify-between"><span>Termo 1L — Norte</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: '#c4441c' }}>3 unid. · bajo</span></div>
      <div className="flex justify-between"><span>Set oficina — Sur</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.6)' }}>22 unid.</span></div>
    </div>
  )
}

function PreviewTelegram() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-md px-3 py-2.5 text-white text-xs" style={{ backgroundColor: '#229ed9' }}>
        <TrustGlyph tipo="alerta" className="w-3.5 h-3.5 shrink-0" />
        <span>Termo 1L (Norte) con solo 3 unidades</span>
      </div>
      <div className="flex items-center gap-2 rounded-md px-3 py-2.5 text-white text-xs" style={{ backgroundColor: '#229ed9' }}>
        <TrustGlyph tipo="tarjeta" className="w-3.5 h-3.5 shrink-0" />
        <span>Venta registrada: ₡24.900 (Centro)</span>
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'

function BarraVentana() {
  return (
    <div className="flex gap-1.5 px-3.5 py-2.5" style={{ backgroundColor: 'var(--hc-n-100, #f1f3f6)' }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--hc-primary)' }} />
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--hc-border)' }} />
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--hc-border)' }} />
    </div>
  )
}

function PreviewPos() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 text-[13px]" style={{ color: '#14171c' }}>
      <div className="flex justify-between"><span>Camiseta básica x2</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.7)' }}>₡17.800</span></div>
      <div className="flex justify-between"><span>Termo 1L x1</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.7)' }}>₡6.500</span></div>
      <div className="flex justify-between"><span>Set de oficina x1</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.7)' }}>₡14.200</span></div>
      <div className="flex justify-between pt-[10px] border-t font-semibold" style={{ borderColor: '#e4e7ec' }}>
        <span>Total</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'var(--hc-primary)' }}>₡38.500</span>
      </div>
      <span className="mt-1 py-2.5 rounded-lg text-center text-white text-[13px] font-semibold" style={{ backgroundColor: 'var(--hc-primary)' }}>
        {t('pyme.panelPosCobrar')}
      </span>
    </div>
  )
}

function PreviewInventario() {
  return (
    <div className="flex flex-col gap-2.5 text-[13px]" style={{ color: '#14171c' }}>
      <div className="flex justify-between"><span>Camiseta básica</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.6)', fontSize: 11 }}>40 unid.</span></div>
      <div className="flex justify-between"><span>Termo 1L</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: '#9a6700', fontSize: 11 }}>3 unid. · bajo</span></div>
      <div className="flex justify-between"><span>Set de oficina</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.6)', fontSize: 11 }}>22 unid.</span></div>
    </div>
  )
}

function PreviewTelegram() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-white text-xs" style={{ backgroundColor: '#229ed9' }}>
        <TrustGlyph tipo="paquete" className="w-3.5 h-3.5 shrink-0" />
        <span>{t('pyme.panelTelegramAlerta1')}</span>
      </div>
      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-white text-xs" style={{ backgroundColor: '#229ed9' }}>
        <TrustGlyph tipo="tarjeta" className="w-3.5 h-3.5 shrink-0" />
        <span>{t('pyme.panelTelegramAlerta2')}</span>
      </div>
    </div>
  )
}

const TARJETAS = [
  { tipo: 'pos', tituloKey: 'panelPosTitulo', descKey: 'panelPosDesc', bg: 'var(--hc-surface)' },
  { tipo: 'inventario', tituloKey: 'panelInventarioTitulo', descKey: 'panelInventarioDesc', bg: 'var(--hc-surface)' },
  { tipo: 'telegram', tituloKey: 'panelTelegramTitulo', descKey: 'panelTelegramDesc', bg: '#eaf6fc' },
] as const

const ROTACION = ['rotate-[0.6deg]', 'rotate-[-0.8deg]', 'rotate-[0.8deg]'] as const

/** Tres previews del panel PYME: punto de venta, inventario, avisos de Telegram. */
export default function PymeTodoEnPanel() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--hc-text)' }}>
        {t('pyme.panelTitle')}
      </h2>
      <div className="grid sm:grid-cols-3 gap-7">
        {TARJETAS.map(({ tipo, tituloKey, descKey, bg }, i) => (
          <motion.div
            key={tipo}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex flex-col gap-3.5"
          >
            <div
              className={`rounded-[14px] border overflow-hidden shadow-[0px_10px_24px_0px_rgba(10,20,46,0.1)] ${ROTACION[i]}`}
              style={{ borderColor: 'var(--hc-border)', backgroundColor: bg }}
            >
              <BarraVentana />
              <div className="p-4">
                {tipo === 'pos' ? <PreviewPos /> : null}
                {tipo === 'inventario' ? <PreviewInventario /> : null}
                {tipo === 'telegram' ? <PreviewTelegram /> : null}
              </div>
            </div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--hc-text)' }}>
              {t(`pyme.${tituloKey}`)}
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
              {t(`pyme.${descKey}`)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

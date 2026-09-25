import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'

function BarraVentana() {
  return (
    <div className="flex gap-1.5 px-3.5 py-2.5" style={{ backgroundColor: '#efe5d4' }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d8c7a8' }} />
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d8c7a8' }} />
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d8c7a8' }} />
    </div>
  )
}

const TARJETAS = ['pos', 'catalogo', 'telegram'] as const

const ROTACION_TARJETA = ['rotate-[1deg]', 'rotate-[-1.5deg]', 'rotate-[1.5deg]'] as const

/** Tres previews del panel: punto de venta, catálogo, avisos por Telegram. */
export default function EmprendePanelPreview() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--hc-text)' }}>
        {t('emprende.panelTitle')}
      </h2>
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
              className={`rounded-[18px] border-[1.2px] overflow-hidden shadow-[0px_10px_22px_0px_rgba(64,38,13,0.14)] ${ROTACION_TARJETA[i]}`}
              style={{ borderColor: '#e8dcc8', backgroundColor: tipo === 'telegram' ? '#eaf6fc' : '#fffbf5' }}
            >
              <BarraVentana />
              <div className="p-4">
                {tipo === 'pos' ? <PreviewPos /> : null}
                {tipo === 'catalogo' ? <PreviewCatalogo /> : null}
                {tipo === 'telegram' ? <PreviewTelegram /> : null}
              </div>
            </div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--hc-text)' }}>
              {t(`emprende.panel${capitalize(tipo)}Titulo`)}
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
              {t(`emprende.panel${capitalize(tipo)}Desc`)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function PreviewPos() {
  return (
    <div className="flex flex-col gap-2 text-[13px]" style={{ color: '#14171c' }}>
      <div className="flex justify-between"><span>Aretes de feria x2</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.7)' }}>₡7.000</span></div>
      <div className="flex justify-between"><span>Bolso tejido x1</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.7)' }}>₡12.000</span></div>
      <div className="flex justify-between pt-[10px] border-t font-semibold" style={{ borderColor: '#e8dcc8' }}>
        <span>Total</span><span style={{ fontFamily: 'var(--hc-font-mono)', color: 'var(--hc-primary)' }}>₡19.000</span>
      </div>
      <span className="mt-1 py-2.5 rounded-full text-center text-white text-[13px] font-semibold" style={{ backgroundColor: 'var(--hc-primary)' }}>Cobrar</span>
    </div>
  )
}

function PreviewCatalogo() {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] font-semibold" style={{ color: '#14171c' }}>Publicar producto</p>
      <div className="flex items-center gap-2.5">
        <span className="w-[60px] h-[60px] rounded-lg shrink-0" style={{ backgroundColor: '#eadfc9' }} />
        <div className="text-[13px]">
          <p className="font-semibold" style={{ color: '#14171c' }}>Set de velas</p>
          <p style={{ fontFamily: 'var(--hc-font-mono)', color: 'rgba(20,23,28,0.6)', fontSize: 11 }}>₡8.500 · Hogar</p>
        </div>
      </div>
      <span className="mt-1 py-2.5 rounded-full text-center text-white text-[13px] font-semibold" style={{ backgroundColor: 'var(--hc-primary)' }}>Publicar</span>
    </div>
  )
}

function PreviewTelegram() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-white text-xs" style={{ backgroundColor: '#229ed9' }}>
        <TrustGlyph tipo="tarjeta" className="w-3.5 h-3.5 shrink-0" />
        <span>Venta registrada: ₡7.000</span>
      </div>
      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-white text-xs" style={{ backgroundColor: '#229ed9' }}>
        <TrustGlyph tipo="paquete" className="w-3.5 h-3.5 shrink-0" />
        <span>Publicaste: Set de velas</span>
      </div>
    </div>
  )
}

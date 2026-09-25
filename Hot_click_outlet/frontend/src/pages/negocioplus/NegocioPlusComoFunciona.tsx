import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'

/**
 * "Mirá cómo funciona" + logos de confianza. El Figma referencia un video
 * grabado (HotClick-recorrido-final.mp4) que todavía no existe como asset
 * del proyecto: se implementa como preview estático (sin <video>) en vez de
 * inventar un archivo que no existe.
 */
export default function NegocioPlusComoFunciona() {
  const { t } = useTranslation()

  return (
    <section className="scroll-mt-24 py-10 sm:py-12 border-t" style={{ borderColor: 'var(--hc-border)' }}>
      <div className="flex flex-col items-center gap-8 py-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-center" style={{ color: 'var(--hc-text)' }}>
          {t('negocioPlus.comoFuncionaTitle')}
        </h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-xl flex items-center justify-center"
          style={{ backgroundColor: '#0e1b33' }}
        >
          <span
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--hc-blue-600)' }}
            aria-label={t('negocioPlus.comoFuncionaPlay')}
          >
            <TrustGlyph tipo="reproducir" className="w-7 h-7 text-white translate-x-0.5" />
          </span>
        </motion.div>
        <p className="text-xs text-center max-w-md" style={{ color: 'var(--hc-muted)' }}>
          {t('negocioPlus.comoFuncionaCaption')}
        </p>

        <div className="flex flex-col items-center gap-4 pt-4">
          <p className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>
            {t('negocioPlus.confianzaTitle')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-[120px] h-12 rounded-[10px] border flex items-center justify-center text-xs"
                style={{ backgroundColor: 'var(--hc-surface-2, #F8F9FB)', borderColor: 'var(--hc-border)', color: 'rgba(20,23,28,0.45)' }}
              >
                {t('negocioPlus.confianzaLogoPlaceholder')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

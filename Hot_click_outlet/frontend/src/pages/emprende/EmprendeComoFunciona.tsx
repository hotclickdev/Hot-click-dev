import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { FOTOS_EMPRENDE } from './emprendeImagenes'

/** Video del recorrido + logos de negocios que ya confían en HotClick. */
export default function EmprendeComoFunciona() {
  const { t } = useTranslation()
  const [reproduciendo, setReproduciendo] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  function reproducir() {
    setReproduciendo(true)
    videoRef.current?.play()
  }

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-center" style={{ color: 'var(--hc-text)' }}>
        {t('emprende.comoFuncionaTitle')}
      </h2>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-xl"
        style={{ backgroundColor: '#14171c' }}
      >
        <video
          ref={videoRef}
          src="/emprende/recorrido.mp4"
          poster={FOTOS_EMPRENDE.tienda.local}
          controls={reproduciendo}
          playsInline
          className="w-full aspect-video object-cover"
        />
        {!reproduciendo ? (
          <button
            type="button"
            onClick={reproducir}
            aria-label={t('emprende.comoFuncionaPlay')}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <span
              className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: 'var(--hc-primary)' }}
            >
              <TrustGlyph tipo="reproducir" className="w-7 h-7 text-white translate-x-0.5" />
            </span>
          </button>
        ) : null}
      </motion.div>
      <p className="text-xs text-center max-w-md" style={{ color: 'var(--hc-muted)' }}>
        {t('emprende.comoFuncionaCaption')}
      </p>

      <div className="flex flex-col items-center gap-4 pt-4">
        <p className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>
          {t('emprende.confianzaTitle')}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-[120px] h-12 rounded-[10px] border border-dashed flex items-center justify-center text-xs"
              style={{ backgroundColor: '#fffbf5', borderColor: '#e8dcc8', color: 'rgba(20,23,28,0.45)' }}
            >
              {t('emprende.confianzaLogoPlaceholder')}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

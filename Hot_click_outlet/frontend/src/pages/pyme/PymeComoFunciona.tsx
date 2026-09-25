import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'

/** Video del recorrido del panel PYME. */
export default function PymeComoFunciona() {
  const { t } = useTranslation()
  const [reproduciendo, setReproduciendo] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  function reproducir() {
    setReproduciendo(true)
    videoRef.current?.play()
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-center" style={{ color: 'var(--hc-text)' }}>
        {t('pyme.comoFuncionaTitle')}
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
          src="/pyme/recorrido.mp4"
          controls={reproduciendo}
          playsInline
          className="w-full aspect-video object-cover"
        />
        {!reproduciendo ? (
          <button
            type="button"
            onClick={reproducir}
            aria-label={t('pyme.comoFuncionaPlay')}
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
        {t('pyme.comoFuncionaCaption')}
      </p>
    </div>
  )
}

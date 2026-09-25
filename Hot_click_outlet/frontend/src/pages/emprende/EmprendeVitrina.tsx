import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'
import EmprendeFoto from './EmprendeFoto'
import { FOTOS_EMPRENDE } from './emprendeImagenes'

const TARJETAS = [
  { foto: FOTOS_EMPRENDE.tienda, tituloKey: 'vitrinaCard1Titulo', descKey: 'vitrinaCard1Desc', rot: 'rotate-2', destacada: false },
  { foto: FOTOS_EMPRENDE.mercado, tituloKey: 'vitrinaCard2Titulo', descKey: 'vitrinaCard2Desc', rot: '-rotate-3', destacada: true },
  { foto: FOTOS_EMPRENDE.cafe, tituloKey: 'vitrinaCard3Titulo', descKey: 'vitrinaCard3Desc', rot: 'rotate-1', destacada: false },
] as const

/** Vitrina de fotos estilo polaroid + cita corta de un vendedor. */
export default function EmprendeVitrina() {
  const { t } = useTranslation()

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-6 justify-center sm:justify-start mb-8">
        {TARJETAS.map(({ foto, tituloKey, descKey, rot, destacada }) => (
          <motion.figure
            key={tituloKey}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            whileHover={{ rotate: 0, scale: 1.03 }}
            transition={{ duration: 0.4 }}
            className={`${rot} w-[200px] p-3 pb-4 rounded-sm border shadow-lg`}
            style={{ backgroundColor: '#fffbf5', borderColor: '#e8dcc8' }}
          >
            <div className="relative">
              <EmprendeFoto
                src={foto.local}
                fallback={foto.fallback}
                alt={t(foto.claveAlt)}
                className="w-full h-[150px] object-cover"
              />
              {destacada ? (
                <span
                  className="absolute -top-4 -right-6 -rotate-8 px-3.5 py-2.5 rounded-full text-xs font-semibold text-white whitespace-nowrap"
                  style={{ backgroundColor: '#c97b4a' }}
                >
                  {t('emprende.vitrinaSticker')}
                </span>
              ) : null}
            </div>
            <figcaption className="pt-2.5">
              <p className="text-sm font-semibold" style={{ color: '#14171c' }}>{t(`emprende.${tituloKey}`)}</p>
              <p className="text-xs" style={{ color: 'rgba(20,23,28,0.55)' }}>{t(`emprende.${descKey}`)}</p>
            </figcaption>
          </motion.figure>
        ))}
      </div>

      <div
        className="rotate-1 flex gap-6 items-center rounded-2xl border border-dashed px-6 py-6 sm:px-8 sm:py-7"
        style={{ backgroundColor: '#fffbf5', borderColor: '#c97b4a' }}
      >
        <span
          className="shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: 'var(--hc-primary)' }}
        >
          <TrustGlyph tipo="estrella" className="w-7 h-7 text-white" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: '#14171c' }}>{t('emprende.vitrinaCita')}</p>
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { getOptimizedUrl } from '@/utils/imageUtils'
import { SectionHeader } from '@/components/ui/Section'
import TrustGlyph from '@/components/ui/TrustGlyph'

export type MarcaHome = {
  id?: number | string
  nombreMarca: string
  logoUrl?: string | null
}

function MarcaChip({ marca }: { marca: MarcaHome }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -3 }}
    >
      <Link
        to={`/productos?marcas=${marca.id}`}
        className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border transition-all group"
        style={{ background: 'var(--hc-surface)', borderColor: 'var(--hc-border)', minWidth: '90px' }}
      >
        <div className="w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden transition-colors"
          style={{ background: 'color-mix(in srgb, var(--hc-text) 4%, transparent)', borderColor: 'var(--hc-border)' }}>
          {marca.logoUrl ? (
            <img
              src={getOptimizedUrl(marca.logoUrl, { width: 56, quality: 80 })}
              alt={marca.nombreMarca}
              className="w-full h-full object-contain p-1.5"
              loading="lazy" decoding="async" width={56} height={56}
            />
          ) : (
            <span className="opacity-40" style={{ color: 'var(--hc-muted)' }}>
              <TrustGlyph tipo="etiqueta" className="w-6 h-6" />
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-center leading-tight group-hover:opacity-70 transition-opacity"
          style={{ color: 'var(--hc-text)' }}>
          {marca.nombreMarca}
        </span>
      </Link>
    </motion.div>
  )
}

/**
 * Franja de marcas. Siempre montada (minHeight) para evitar CLS al cargar.
 */
export default function HomeMarcas({ marcas = [] }: { marcas?: MarcaHome[] }) {
  const { t } = useTranslation()
  return (
    <section style={{ minHeight: '130px' }}>
      {marcas.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <SectionHeader
            title={`${t('home.brands')}.`}
            subtitle="Confianza que se reconoce."
            action={{ label: 'Ver todas', to: '/productos' }}
          />
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            {marcas.map((m) => (
              <MarcaChip key={m.id} marca={m} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

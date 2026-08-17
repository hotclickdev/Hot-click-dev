import { useTranslation } from 'react-i18next'
import { WhatsIconSm } from './informacionIcons'

/** CTA de WhatsApp al final de la página. */
export default function InformacionCta() {
  const { t } = useTranslation()
  return (
    <section className="text-center">
      <div className="relative rounded-3xl bg-[#111114] border border-white/8 p-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4f7cff]/8 to-[var(--hc-blue-500)]/5 pointer-events-none" />
        <div className="relative">
          <h2 className="text-2xl font-bold text-[#e8e8ed] mb-3">{t('informacion.ctaTitle')}</h2>
          <p className="text-[#8e8e9a] mb-6 max-w-sm mx-auto text-sm">{t('informacion.ctaSub')}</p>
          <a
            href="https://wa.me/50686667888"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-sm transition-all shadow-[0_0_24px_rgba(37,211,102,0.25)]"
          >
            <WhatsIconSm /> {t('informacion.ctaBtn')}
          </a>
        </div>
      </div>
    </section>
  )
}

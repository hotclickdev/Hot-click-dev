import { useTranslation } from 'react-i18next'
import { ChatTrustIcon, LockTrustIcon, CheckTrustIcon, TruckStepIcon } from './homeIcons'

/* Franja de confianza bajo el hero (patrón Mercurio × Brand Book §15.1):
   los diferenciadores reales del negocio, con icono azul — el color guía, no decora. */
export default function TrustStrip() {
  const { t } = useTranslation()
  const items = [
    { icon: <ChatTrustIcon />, title: 'Estamos disponibles', desc: 'Escribinos por WhatsApp', href: 'https://wa.me/50686667888' },
    { icon: <TruckStepIcon />, title: t('home.feat1Title'), desc: t('home.feat1Desc') },
    { icon: <LockTrustIcon />, title: t('home.feat2Title'), desc: t('home.feat2Desc') },
    { icon: <CheckTrustIcon />, title: t('home.feat3Title'), desc: t('home.feat3Desc') },
  ]
  return (
    <section style={{ background: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)', borderBottom: '1px solid var(--hc-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map(({ icon, title, desc, href }) => {
          const Tag = href ? 'a' : 'div'
          return (
            <Tag
              key={title}
              {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex items-center gap-3"
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-link)' }}
                aria-hidden="true"
              >
                {icon}
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight" style={{ color: 'var(--hc-text)' }}>{title}</span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{desc}</span>
              </span>
            </Tag>
          )
        })}
      </div>
    </section>
  )
}

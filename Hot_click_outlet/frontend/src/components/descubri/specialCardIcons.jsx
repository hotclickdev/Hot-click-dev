export const IconShield = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3l7 3v5c0 4.6-3 8.7-7 10-4-1.3-7-5.4-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
export const IconTruck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 7h12v9H2z" />
    <path d="M14 10h4l3 3v3h-7" />
    <circle cx="6.5" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
)
export const IconLock = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
)
export const IconStore = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 10l1.2-5h13.6L20 10" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </svg>
)

// Config por sub-variante de tarjeta info. CTA con `to` navega interno.
export const INFO_CONFIG = {
  about: {
    icon: IconShield,
    kicker: 'descubri.infoAboutKicker',
    title: 'descubri.infoAboutTitle',
    body: 'descubri.infoAboutBody',
    cta: { label: 'descubri.infoAboutCta', to: '/nosotros', id: 'nosotros' },
  },
  envios: {
    icon: IconTruck,
    kicker: 'descubri.infoEnviosKicker',
    title: 'descubri.infoEnviosTitle',
    body: 'descubri.infoEnviosBody',
    cta: null,
  },
  pago: {
    icon: IconLock,
    kicker: 'descubri.infoPagoKicker',
    title: 'descubri.infoPagoTitle',
    body: 'descubri.infoPagoBody',
    cta: { label: 'descubri.infoPagoCta', to: '/informacion', id: 'informacion' },
  },
}

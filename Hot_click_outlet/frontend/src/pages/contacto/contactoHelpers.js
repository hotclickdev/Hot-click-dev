export const WHATSAPP = '50686667888'
export const SITE_URL = 'https://hotclick.lat'
export const FORM_VACIO = { nombre: '', correo: '', mensaje: '' }

export const contactPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contacto HotClick — Soporte al cliente en Costa Rica',
  description: 'Contactá al equipo de HotClick por WhatsApp, email o formulario. Atención en horario extendido de lunes a sábado.',
  url: `${SITE_URL}/contacto`,
  inLanguage: 'es-CR',
  mainEntity: {
    '@type': 'Organization',
    name: 'HotClick',
    url: SITE_URL,
    telephone: '+506-8666-7888',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+506-8666-7888',
        contactType: 'customer service',
        contactOption: 'TollFree',
        availableLanguage: 'Spanish',
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '08:00',
          closes: '19:00',
        },
      },
      {
        '@type': 'ContactPoint',
        url: `https://wa.me/${WHATSAPP}`,
        contactType: 'customer support',
        availableLanguage: 'Spanish',
      },
    ],
  },
}

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
})

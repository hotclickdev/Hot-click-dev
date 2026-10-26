import { SOPORTE_TELEFONO, SOPORTE_WA } from '@/config/soporteTelefono'

/** Dígitos para wa.me; vacío si VITE_SOPORTE_TELEFONO no está configurado. */
export const WHATSAPP = SOPORTE_WA
export const SITE_URL = 'https://hotclick.lat'
export type FormContacto = {
  nombre: string
  correo: string
  mensaje: string
}

export const FORM_VACIO: FormContacto = { nombre: '', correo: '', mensaje: '' }

export function construirContactPageJsonLd(telefono: string, wa: string) {
  return {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contacto HotClick — Soporte al cliente en Costa Rica',
  description: 'Contactá al equipo de HotClick por WhatsApp, email o formulario. Atención Lun–Sáb 8:00–19:00.',
  url: `${SITE_URL}/contacto`,
  inLanguage: 'es-CR',
  mainEntity: {
    '@type': 'Organization',
    name: 'HotClick',
    url: SITE_URL,
    ...(telefono ? { telephone: telefono } : {}),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        ...(telefono ? { telephone: telefono } : {}),
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
      ...(wa
        ? [{
          '@type': 'ContactPoint',
          url: `https://wa.me/${wa}`,
          contactType: 'customer support',
          availableLanguage: 'Spanish',
        }]
        : []),
    ],
  },
  }
}

export const contactPageJsonLd = construirContactPageJsonLd(SOPORTE_TELEFONO, WHATSAPP)

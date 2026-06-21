import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

const WHATSAPP = '50686667888'
const SITE_URL = 'https://hotclick.lat'

const contactPageJsonLd = {
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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
})

export default function ContactoPage() {
  const toast = useToast()
  const { t } = useTranslation()
  const [form, setForm] = useState({ nombre: '', correo: '', mensaje: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setSent(true)
      toast({ message: t('contacto.successToast'), type: 'success' })
    } catch {
      toast({ message: t('contacto.errorToast'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <Helmet>
        <title>Contacto — HotClick Marketplace Costa Rica</title>
        <meta name="description" content="Contactá al equipo de HotClick por WhatsApp al +506 8666-7888, por email o formulario. Atención de lunes a sábado 8 a.m.–7 p.m." />
        <link rel="canonical" href={`${SITE_URL}/contacto`} />
        <link rel="alternate" hreflang="es-CR" href={`${SITE_URL}/contacto`} />
        <link rel="alternate" hreflang="es"    href={`${SITE_URL}/contacto`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contacto HotClick — Soporte al cliente en Costa Rica" />
        <meta property="og:description" content="Escribinos por WhatsApp, email o formulario. Te respondemos el mismo día." />
        <meta property="og:url" content={`${SITE_URL}/contacto`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(contactPageJsonLd)}</script>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <motion.div {...fadeUp()} className="text-center mb-14">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#4f7cff]/15 border border-[#4f7cff]/25 mb-5">
            <svg className="w-7 h-7 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-[#e8e8ed] mb-2">{t('contacto.title')}</h1>
          <p className="text-[#8e8e9a] text-base">{t('contacto.subtitle')}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Form */}
          <motion.div {...fadeUp(0.1)} className="bg-[#111114] border border-white/8 rounded-2xl p-7">
            <h2 className="text-base font-semibold text-[#e8e8ed] mb-6">{t('contacto.sendForm')}</h2>

            {sent ? (
              <motion.div {...fadeUp()} className="text-center py-10 space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-1">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[#e8e8ed] font-semibold text-lg">{t('contacto.sent')}</p>
                <p className="text-sm text-[#8e8e9a]">{t('contacto.sentSub')}</p>
                <button
                  onClick={() => { setSent(false); setForm({ nombre: '', correo: '', mensaje: '' }) }}
                  className="mt-2 text-sm text-[#4f7cff] hover:text-[#3d6ee0] transition-colors"
                >
                  {t('contacto.sendAnother')}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input label={`${t('contacto.name')} *`} value={form.nombre} onChange={set('nombre')} required maxLength={120} />
                <Input label={`${t('contacto.email')} *`} type="email" value={form.correo} onChange={set('correo')} required maxLength={254} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e8e8ed]">{t('contacto.message')} *</label>
                  <textarea
                    value={form.mensaje}
                    onChange={set('mensaje')}
                    required
                    rows={5}
                    maxLength={3000}
                    placeholder={t('contacto.messagePlaceholder')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-[#e8e8ed] placeholder:text-[#8e8e9a]/60 focus:outline-none focus:border-[#4f7cff]/60 resize-none transition-colors"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  style={{ backgroundColor: 'var(--hc-accent)', borderColor: 'var(--hc-accent)', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      {t('contacto.sending')}
                    </span>
                  ) : t('contacto.send')}
                </Button>
              </form>
            )}
          </motion.div>

          {/* Info panel */}
          <div className="space-y-4">

            {/* WhatsApp */}
            <motion.a
              {...fadeUp(0.15)}
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t('contacto.waDefault'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 bg-[#111114] border border-white/8 rounded-2xl hover:border-green-500/30 hover:bg-green-500/5 transition-all group"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#8e8e9a] mb-0.5">WhatsApp</p>
                <p className="text-sm font-semibold text-green-400 group-hover:text-green-300 transition-colors">+506 8666-7888</p>
                <p className="text-xs text-[#8e8e9a] mt-0.5">{t('contacto.waHint')}</p>
              </div>
              <svg className="w-4 h-4 text-[#8e8e9a] group-hover:text-green-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.a>

            {/* Email */}
            <motion.a
              {...fadeUp(0.2)}
              href="mailto:hotclick.cr@gmail.com"
              className="flex items-center gap-4 p-5 bg-[#111114] border border-white/8 rounded-2xl hover:border-[#4f7cff]/30 hover:bg-[#4f7cff]/5 transition-all group"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#4f7cff]/10 border border-[#4f7cff]/20 flex items-center justify-center group-hover:bg-[#4f7cff]/20 transition-colors">
                <svg className="w-5 h-5 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#8e8e9a] mb-0.5">Email</p>
                <p className="text-sm font-semibold text-[#4f7cff] group-hover:text-[#3d6ee0] transition-colors truncate">hotclick.cr@gmail.com</p>
              </div>
              <svg className="w-4 h-4 text-[#8e8e9a] group-hover:text-[#4f7cff] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.a>

            {/* País */}
            <motion.div {...fadeUp(0.25)} className="flex items-center gap-4 p-5 bg-[#111114] border border-white/8 rounded-2xl">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                🇨🇷
              </div>
              <div>
                <p className="text-xs text-[#8e8e9a] mb-0.5">{t('contacto.country')}</p>
                <p className="text-sm font-semibold text-[#e8e8ed]">Costa Rica</p>
              </div>
            </motion.div>

            {/* Horario */}
            <motion.div
              {...fadeUp(0.3)}
              className="p-5 bg-[#4f7cff]/8 border border-[#4f7cff]/20 rounded-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-[#4f7cff]">{t('contacto.schedule')}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-sm text-[#e8e8ed]">{t('contacto.weekdays')}</span>
                  </div>
                  <span className="text-sm font-medium text-[#e8e8ed] tabular-nums">{t('contacto.weekdaysHours')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8e8e9a]/40 flex-shrink-0" />
                    <span className="text-sm text-[#8e8e9a]">{t('contacto.weekend')}</span>
                  </div>
                  <span className="text-sm text-[#8e8e9a]">{t('contacto.closed')}</span>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </MainLayout>
  )
}

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

const WHATSAPP = '50689745370'

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-[#e8e8ed] mb-3">{t('contacto.title')}</h1>
          <p className="text-[#8e8e9a]">{t('contacto.subtitle')}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#111114] border border-white/8 rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-[#e8e8ed] mb-5">{t('contacto.sendForm')}</h2>
            {sent ? (
              <div className="text-center py-8 space-y-2">
                <span className="text-5xl">✅</span>
                <p className="text-[#e8e8ed] font-medium mt-3">{t('contacto.sent')}</p>
                <p className="text-sm text-[#8e8e9a]">{t('contacto.sentSub')}</p>
                <Button variant="ghost" onClick={() => { setSent(false); setForm({ nombre: '', correo: '', mensaje: '' }) }} className="mt-3">
                  {t('contacto.sendAnother')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label={`${t('contacto.name')} *`} value={form.nombre} onChange={set('nombre')} required />
                <Input label={`${t('contacto.email')} *`} type="email" value={form.correo} onChange={set('correo')} required />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e8e8ed]">{t('contacto.message')} *</label>
                  <textarea
                    value={form.mensaje}
                    onChange={set('mensaje')}
                    required
                    rows={4}
                    placeholder={t('contacto.messagePlaceholder')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-[#e8e8ed] placeholder:text-[#8e8e9a]/60 focus:outline-none focus:border-[#4f7cff]/60 resize-none transition-colors"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  style={{ backgroundColor: '#4f7cff', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? t('contacto.sending') : t('contacto.send')}
                </Button>
              </form>
            )}
          </motion.div>

          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {[
              { icon: '💬', title: 'WhatsApp', value: '+506 8974-5370', href: `https://wa.me/${WHATSAPP}` },
              { icon: '📧', title: 'Email', value: 'hotclick.cr@gmail.com', href: 'mailto:hotclick.cr@gmail.com' },
              { icon: '🇨🇷', title: 'País', value: 'Costa Rica' },
            ].map(({ icon, title, value, href }) => (
              <div key={title} className="flex items-center gap-4 p-5 bg-[#111114] border border-white/8 rounded-2xl">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-xs text-[#8e8e9a] mb-0.5">{title}</p>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-[#4f7cff] hover:text-[#3d6ee0] transition-colors">
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-[#e8e8ed]">{value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="p-5 bg-[#4f7cff]/8 border border-[#4f7cff]/15 rounded-2xl">
              <p className="text-sm text-[#8e8e9a] mb-3">{t('contacto.schedule')}</p>
              <p className="text-sm text-[#e8e8ed]">{t('contacto.weekdays')}</p>
              <p className="text-sm text-[#e8e8ed]">{t('contacto.saturday')}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  )
}

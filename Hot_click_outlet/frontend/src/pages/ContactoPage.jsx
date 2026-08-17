import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { useToast } from '@/components/ui/Toast'
import { enviarContacto } from '@/services/contactoService'
import ContactoSeo from './contacto/ContactoSeo'
import ContactoFormulario from './contacto/ContactoFormulario'
import ContactoCanales from './contacto/ContactoCanales'
import { fadeUp, FORM_VACIO } from './contacto/contactoHelpers'

export default function ContactoPage() {
  const toast = useToast()
  const { t } = useTranslation()
  const [form, setForm] = useState(FORM_VACIO)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const setCampo = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await enviarContacto(form)
      setSent(true)
      toast({ message: t('contacto.successToast'), type: 'success' })
    } catch (err) {
      console.error('[ContactoPage] enviar', err)
      toast({ message: t('contacto.errorToast'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <ContactoSeo />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
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
          <ContactoFormulario
            form={form}
            sent={sent}
            loading={loading}
            onChange={setCampo}
            onSubmit={handleSubmit}
            onReset={(vacio) => { setSent(false); setForm(vacio) }}
          />
          <ContactoCanales />
        </div>
      </div>
    </MainLayout>
  )
}

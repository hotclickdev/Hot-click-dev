import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { fadeUp, FORM_VACIO } from './contactoHelpers'

export default function ContactoFormulario({
  form,
  sent,
  loading,
  onChange,
  onSubmit,
  onReset,
}) {
  const { t } = useTranslation()

  return (
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
          <button type="button"
            onClick={() => onReset(FORM_VACIO)}
            className="mt-2 text-sm text-[#4f7cff] hover:text-[#3d6ee0] transition-colors"
          >
            {t('contacto.sendAnother')}
          </button>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Input id="contacto-nombre" label={`${t('contacto.name')} *`} value={form.nombre} onChange={onChange('nombre')} required maxLength={120} />
          <Input id="contacto-correo" label={`${t('contacto.email')} *`} type="email" value={form.correo} onChange={onChange('correo')} required maxLength={254} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contacto-mensaje" className="text-sm font-medium text-[#e8e8ed]">{t('contacto.message')} *</label>
            <textarea id="contacto-mensaje"
              value={form.mensaje}
              onChange={onChange('mensaje')}
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
            {contenidoBotonEnviar(loading, t)}
          </Button>
        </form>
      )}
    </motion.div>
  )
}

function contenidoBotonEnviar(loading, t) {
  if (!loading) return t('contacto.send')
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      {t('contacto.sending')}
    </span>
  )
}

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import PaginaInformativa, { BloqueInformativo } from '@/components/comprador/PaginaInformativa'
import { useToast } from '@/components/ui/Toast'
import { enviarContacto } from '@/services/contactoService'
import { useTurnstileForm } from '@/hooks/useTurnstileForm'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'
import ContactoSeo from './contacto/ContactoSeo'
import ContactoFormulario from './contacto/ContactoFormulario'
import { ContactoCanales, ContactoHorario } from './contacto/ContactoCanales'
import { FORM_VACIO, type FormContacto } from './contacto/contactoHelpers'

/**
 * Contacto con la plantilla informativa de Figma `28:1660` (derivado de Figma: no tiene frame propio).
 * Canales en filas, formulario con los campos del checkout y horario.
 */
export default function ContactoPage() {
  const toast = useToast()
  const { t } = useTranslation()
  const [form, setForm] = useState<FormContacto>(FORM_VACIO)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const {
    turnstileRef, turnstileToken, setTurnstileToken,
    resetTurnstile, turnstileSiteKey, turnstileBloqueaSubmit,
  } = useTurnstileForm()

  const setCampo = (campo: keyof FormContacto, valor: string) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      await enviarContacto({ ...form, turnstileToken: turnstileToken || undefined })
      setSent(true)
      toast({ message: t('contacto.successToast'), type: 'success' })
    } catch (err: unknown) {
      console.error('[ContactoPage] enviar', err)
      toast({ message: mensajeErrorApi(err, t('contacto.errorToast')), type: 'error' })
      resetTurnstile()
    } finally {
      setLoading(false)
    }
  }

  return (
    <PaginaInformativa
      titulo={t('contacto.title')}
      encabezado={t('contacto.title')}
      subtitulo={t('contacto.subtitle')}
      indice={[
        { id: 'canales', texto: t('contacto.canales') },
        { id: 'mensaje', texto: t('contacto.sendForm') },
        { id: 'horario', texto: t('contacto.schedule') },
      ]}
    >
      <ContactoSeo />
      <div className="flex flex-col bg-hc-n-50 pb-8 lg:bg-transparent">
        <BloqueInformativo id="canales" titulo={t('contacto.canales')}>
          <ContactoCanales />
        </BloqueInformativo>
        <BloqueInformativo id="mensaje" titulo={t('contacto.sendForm')}>
          <ContactoFormulario
            form={form}
            sent={sent}
            loading={loading}
            turnstileSiteKey={turnstileSiteKey}
            turnstileRef={turnstileRef}
            setTurnstileToken={setTurnstileToken}
            turnstileBloqueaSubmit={turnstileBloqueaSubmit}
            onChange={setCampo}
            onSubmit={handleSubmit}
            onReset={(vacio) => { setSent(false); setForm(vacio); resetTurnstile() }}
          />
        </BloqueInformativo>
        <BloqueInformativo id="horario" titulo={t('contacto.schedule')}>
          <ContactoHorario />
        </BloqueInformativo>
      </div>
    </PaginaInformativa>
  )
}

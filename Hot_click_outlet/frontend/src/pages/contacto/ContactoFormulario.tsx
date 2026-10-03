import { useTranslation } from 'react-i18next'
import TurnstileCampo from '@/components/security/TurnstileCampo'
import { Campo, CampoTexto } from '../checkout/PiezasCheckout'
import { FORM_VACIO, type FormContacto } from './contactoHelpers'
import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

export type ContactoFormularioProps = {
  form: FormContacto
  sent: boolean
  loading: boolean
  turnstileSiteKey: string | undefined
  turnstileRef: RefObject<TurnstileInstance | null>
  setTurnstileToken: Dispatch<SetStateAction<string>>
  turnstileBloqueaSubmit: boolean
  onChange: (campo: keyof FormContacto, valor: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onReset: (vacio: FormContacto) => void
}

const TARJETA = 'flex flex-col gap-[14px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 leading-[normal]'

/** Mensaje enviado: check verde en círculo, como la confirmación de 29:1932 (derivado de Figma). */
function Enviado({ onOtro }: { onOtro: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="status" className={`${TARJETA} items-center py-8 text-center`}>
      <span className="flex size-14 items-center justify-center rounded-full bg-hc-green-50 text-hc-green-600"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-7"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      <span className="font-display text-[17px] font-bold text-hc-n-900">{t('contacto.sent')}</span>
      <span className="text-[14px] leading-5 text-hc-n-600">{t('contacto.sentSub')}</span>
      <button type="button" onClick={onOtro} className="rounded-[12px] border border-hc-n-200 px-4 py-[11px] text-[14px] font-semibold text-hc-n-600">
        {t('contacto.sendAnother')}
      </button>
    </div>
  )
}

/** Formulario de contacto con los campos del checkout (Figma `28:1110` / `28:1112`). */
export default function ContactoFormulario({
  form, sent, loading, turnstileSiteKey, turnstileRef, setTurnstileToken, turnstileBloqueaSubmit, onChange, onSubmit, onReset,
}: ContactoFormularioProps) {
  const { t } = useTranslation()
  if (sent) return <Enviado onOtro={() => onReset(FORM_VACIO)} />
  return (
    <form onSubmit={onSubmit} className={TARJETA}>
      <Campo etiqueta={t('contacto.name')}>
        {({ id, describedBy }) => (
          <CampoTexto id={id} describedBy={describedBy} valor={form.nombre} onCambiar={(v) => onChange('nombre', v)} escritorio={false} autoComplete="name" maxLength={120} />
        )}
      </Campo>
      <Campo etiqueta={t('contacto.email')}>
        {({ id, describedBy }) => (
          <CampoTexto id={id} describedBy={describedBy} valor={form.correo} onCambiar={(v) => onChange('correo', v)} escritorio={false} tipo="email" inputMode="email" autoComplete="email" maxLength={254} />
        )}
      </Campo>
      <Campo etiqueta={t('contacto.message')}>
        {({ id, describedBy }) => (
          <textarea
            id={id}
            aria-describedby={describedBy}
            value={form.mensaje}
            onChange={(e) => onChange('mensaje', e.target.value)}
            required
            rows={5}
            maxLength={3000}
            placeholder={t('contacto.messagePlaceholder')}
            className="hc-input-libre w-full resize-none rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[21px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
          />
        )}
      </Campo>
      <TurnstileCampo siteKey={turnstileSiteKey} turnstileRef={turnstileRef} setTurnstileToken={setTurnstileToken} />
      <button
        type="submit"
        disabled={loading || turnstileBloqueaSubmit || !form.nombre.trim() || !form.correo.trim() || !form.mensaje.trim()}
        className="flex items-center justify-center gap-2 rounded-[12px] bg-hc-red-500 px-4 py-[14px] text-[15px] font-semibold text-hc-n-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-hc-n-0/40 border-t-hc-n-0" />}
        {loading ? t('contacto.sending') : t('contacto.send')}
      </button>
    </form>
  )
}

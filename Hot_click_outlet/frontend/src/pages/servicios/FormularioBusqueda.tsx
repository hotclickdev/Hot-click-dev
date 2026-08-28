import { motion } from 'framer-motion'
import PhoneField from '@/components/ui/PhoneField'
import Field from './Field'
import { MAX_FOTOS, inputStyle, type FormBusqueda, type FotoSolicitud, type TabBusqueda } from './serviciosHelpers'
import CloseIcon from '@/components/ui/CloseIcon'
import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from 'react'
import type { TFunction } from 'i18next'

function CheckIcon({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function SendIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function ClockIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  )
}

function WarnIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export type FormularioBusquedaProps = {
  token: string | null
  success: boolean
  setSuccess: Dispatch<SetStateAction<boolean>>
  setTabBusqueda: Dispatch<SetStateAction<TabBusqueda>>
  form: FormBusqueda
  setForm: Dispatch<SetStateAction<FormBusqueda>>
  phone: string
  setPhone: Dispatch<SetStateAction<string>>
  fotos: FotoSolicitud[]
  setFotos: Dispatch<SetStateAction<FotoSolicitud[]>>
  uploading: boolean
  sending: boolean
  error: string
  fileRef: RefObject<HTMLInputElement | null>
  handleEnviar: (e: FormEvent<HTMLFormElement>) => void
  handleFotoChange: (e: ChangeEvent<HTMLInputElement>) => void
  t: TFunction
}

/** Formulario de solicitud de búsqueda de producto (éxito o campos). */
export default function FormularioBusqueda({
  token, success, setSuccess, setTabBusqueda, form, setForm, phone, setPhone,
  fotos, setFotos, uploading, sending, error, fileRef, handleEnviar, handleFotoChange, t,
}: FormularioBusquedaProps) {
  if (success) {
    return (
      <div className="text-center py-16 rounded-3xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="mb-5 flex justify-center" style={{ color: 'var(--hc-accent)' }}>
          <CheckIcon />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--hc-text)' }}>
          {t('serviciosPage.successTitle')}
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--hc-muted)' }}>
          {t('serviciosPage.successSub2')}
        </p>
        <button type="button" onClick={() => { setSuccess(false); setTabBusqueda(token ? 'mis-solicitudes' : 'solicitar') }}
          className="px-8 py-3 rounded-2xl text-sm font-bold"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {token ? t('serviciosPage.viewMine') : t('serviciosPage.newRequestBtn')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleEnviar} className="rounded-3xl p-6 sm:p-8 space-y-6"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <Field label={t('serviciosPage.descLabelFull')} required>
        <textarea rows={4} placeholder={t('serviciosPage.descPhFull')}
          value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          style={{ ...inputStyle, resize: 'none' }} />
      </Field>

      <Field label={t('serviciosPage.photosLabelFull')} hint="Máx. 3 · hasta 5 MB c/u">
        <div className="flex flex-wrap gap-3">
          {fotos.map((f, i) => (
            <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ border: '1.5px solid var(--hc-border)' }}>
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setFotos(p => p.filter((_, x) => x !== i))} aria-label="Quitar foto"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                <CloseIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <motion.button type="button" onClick={() => fileRef.current?.click()}
              disabled={uploading} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold flex-shrink-0"
              style={{ border: '2px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
              {uploading
                ? <div className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
                : <><span className="text-3xl leading-none" style={{ color: 'var(--hc-accent)' }}>+</span><span>Foto</span></>
              }
            </motion.button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} />
        <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--hc-muted)' }}>
          <ClockIcon /> Respuesta en menos de 24 horas
        </p>
      </Field>

      <Field label={t('serviciosPage.budgetLabelFull')} hint="Opcional">
        <input type="text" placeholder={t('serviciosPage.budgetPhFull')}
          value={form.presupuesto}
          onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))}
          style={inputStyle} />
      </Field>

      <PhoneField label="Número de teléfono" value={phone} onChange={setPhone} required hint="Te avisamos por WhatsApp" />

      {!token && (
        <Field label="Tu nombre" hint="Opcional">
          <input type="text" placeholder="Ej: María García"
            value={form.nombreContacto}
            onChange={e => setForm(f => ({ ...f, nombreContacto: e.target.value }))}
            style={inputStyle} />
        </Field>
      )}

      {error && (
        <p className="text-sm px-4 py-3 rounded-2xl bg-red-500/10 text-red-400 font-medium flex items-center gap-2">
          <WarnIcon /> {error}
        </p>
      )}

      <motion.button type="submit" disabled={sending || uploading}
        whileHover={{ scale: sending ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
        className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-50"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
        {sending
          ? <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {t('serviciosPage.sending')}
            </span>
          : <span className="flex items-center justify-center gap-2">
              <SendIcon /> {t('serviciosPage.submit')}
            </span>
        }
      </motion.button>
    </form>
  )
}

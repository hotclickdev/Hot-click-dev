import type { ChangeEvent, Dispatch, FormEvent, ReactNode, RefObject, SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import TurnstileCampo from '@/components/security/TurnstileCampo'
import CloseIcon from '@/components/ui/CloseIcon'
import { IcoSrv } from './IcoSrv'
import { CLASE_CAMPO, MAX_FOTOS, type FormBusqueda, type FotoSolicitud } from './serviciosHelpers'

export type FormularioBusquedaProps = {
  token: string | null
  success: boolean
  setSuccess: Dispatch<SetStateAction<boolean>>
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
  etiquetaEnviar?: string
  descLabel?: string
  descPh?: string
  fotosLabel?: string
  ocultarPresupuesto?: boolean
  /** Barra "1 · Foto, 2 · Detalle, 3 · Contacto" de Figma `28:1486`; solo la búsqueda de producto la lleva. */
  mostrarPasos?: boolean
  /** Recuadro "Cómo sigue"; `null` lo oculta. Sin valor, el de la búsqueda de producto. */
  nota?: ReactNode | null
  turnstileSiteKey?: string
  turnstileRef?: RefObject<TurnstileInstance | null>
  setTurnstileToken?: Dispatch<SetStateAction<string>>
  turnstileBloqueaSubmit?: boolean
}

function Paso({ activo, texto }: { activo: boolean; texto: string }) {
  return (
    <span className={`rounded-full px-2 py-[3px] text-[11px] font-semibold leading-[normal] ${activo ? 'bg-hc-blue-600 text-hc-n-0' : 'bg-hc-n-100 text-hc-n-600'}`}>
      {texto}
    </span>
  )
}

function Campo({ id, etiqueta, children }: { id?: string; etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={id} className="text-[13px] font-semibold leading-[normal] text-hc-n-900">{etiqueta}</label>
      {children}
    </div>
  )
}

function Enviado({ token, setSuccess }: Pick<FormularioBusquedaProps, 'token' | 'setSuccess'>) {
  const { t } = useTranslation()
  const clase = 'flex min-h-12 w-full items-center justify-center rounded-[12px] px-4 text-[15px] font-semibold'
  return (
    <section className="flex flex-col items-center gap-3 bg-hc-n-0 px-5 pb-8 pt-10 text-center leading-[normal]">
      <span className="flex size-16 items-center justify-center rounded-full bg-hc-success-bg text-hc-success">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <h2 className="leading-[normal] font-display text-[20px] font-bold text-hc-n-900">{t('serviciosPage.successTitle')}</h2>
      <p className="text-[14px] leading-5 text-hc-n-600">{t('serviciosPage.successSub2')}</p>
      {token ? (
        <Link to="/servicios?vista=solicitudes" className={`${clase} mt-2 bg-hc-red-500 text-hc-n-0`}>{t('serviciosPage.viewMine')}</Link>
      ) : (
        <button type="button" onClick={() => setSuccess(false)} className={`${clase} mt-2 bg-hc-red-500 text-hc-n-0`}>
          {t('serviciosPage.newRequestBtn')}
        </button>
      )}
    </section>
  )
}

/** Formulario de solicitud de búsqueda de producto (Figma `28:1486`): foto, detalle, presupuesto, WhatsApp y envío. */
export default function FormularioBusqueda({
  token, success, setSuccess, form, setForm, phone, setPhone,
  fotos, setFotos, uploading, sending, error, fileRef, handleEnviar, handleFotoChange,
  etiquetaEnviar, descLabel, descPh, fotosLabel, ocultarPresupuesto = false, mostrarPasos = false, nota,
  turnstileSiteKey, turnstileRef, setTurnstileToken, turnstileBloqueaSubmit = false,
}: FormularioBusquedaProps) {
  const { t } = useTranslation()
  if (success) return <Enviado token={token} setSuccess={setSuccess} />

  const textoNota = nota === undefined
    ? t(token ? 'serviciosPage.form.comoSigueTexto' : 'serviciosPage.form.comoSigueTextoInvitado')
    : nota

  return (
    <form onSubmit={handleEnviar} className="flex flex-col leading-[normal]">
      <div className="flex flex-col gap-[18px] px-4 pb-4 pt-[18px] lg:px-0">
        {mostrarPasos && (
          <div className="flex items-center gap-[6px]">
            <Paso activo={fotos.length > 0} texto={t('serviciosPage.form.pasoFoto')} />
            <Paso activo={form.descripcion.trim().length > 0} texto={t('serviciosPage.form.pasoDetalle')} />
            <Paso activo={sending} texto={t('serviciosPage.form.pasoContacto')} />
          </div>
        )}

        <div className="flex flex-col gap-[6px]">
          <p className="text-[13px] font-semibold text-hc-n-900">{fotosLabel ?? t('serviciosPage.form.fotoLabel')}</p>
          <div className="flex items-center gap-[10px]">
            {fotos.map((f, i) => (
              <div key={f.preview} className="relative size-[76px] shrink-0">
                <img src={f.preview} alt="" className="size-full rounded-[12px] object-cover" />
                <button
                  type="button"
                  onClick={() => setFotos((p) => p.filter((_, x) => x !== i))}
                  aria-label={t('serviciosPage.form.quitarFoto')}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-hc-n-900/70 text-hc-n-0"
                >
                  <CloseIcon className="size-3" />
                </button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex size-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-hc-n-400 bg-hc-n-0"
              >
                {uploading ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-hc-n-200 border-t-hc-blue-600" />
                ) : (
                  <>
                    <IcoSrv nombre="fotoCamara" size={20} />
                    <span className="text-[11px] font-semibold text-hc-blue-600">{t('serviciosPage.photoBtn')}</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} />
        </div>

        <Campo id="srv-descripcion" etiqueta={descLabel ?? t('serviciosPage.form.queBuscas')}>
          <textarea
            id="srv-descripcion"
            rows={3}
            placeholder={descPh ?? t('serviciosPage.form.queBuscasPh')}
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className={`${CLASE_CAMPO} min-h-[84px] resize-none`}
          />
        </Campo>

        {!ocultarPresupuesto && (
          <Campo id="srv-presupuesto" etiqueta={t('serviciosPage.form.presupuesto')}>
            <input
              id="srv-presupuesto"
              type="text"
              placeholder={t('serviciosPage.form.presupuestoPh')}
              value={form.presupuesto}
              onChange={(e) => setForm((f) => ({ ...f, presupuesto: e.target.value }))}
              className={CLASE_CAMPO}
            />
          </Campo>
        )}

        <Campo id="srv-whatsapp" etiqueta={t('serviciosPage.form.whatsapp')}>
          <input
            id="srv-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('serviciosPage.form.whatsappPh')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={CLASE_CAMPO}
          />
        </Campo>

        {!token && (
          <Campo id="srv-nombre" etiqueta={t('serviciosPage.form.nombreOpcional')}>
            <input
              id="srv-nombre"
              type="text"
              placeholder={t('serviciosPage.form.nombrePh')}
              value={form.nombreContacto}
              onChange={(e) => setForm((f) => ({ ...f, nombreContacto: e.target.value }))}
              className={CLASE_CAMPO}
            />
          </Campo>
        )}

        {textoNota && (
          <div className="flex flex-col gap-1 rounded-[16px] bg-hc-n-100 p-4">
            <p className="text-[13px] font-semibold text-hc-n-900">{t('serviciosPage.form.comoSigueTitulo')}</p>
            <p className="text-[12px] leading-[17px] text-hc-n-600">{textoNota}</p>
          </div>
        )}

        {turnstileSiteKey && turnstileRef && setTurnstileToken && (
          <TurnstileCampo siteKey={turnstileSiteKey} turnstileRef={turnstileRef} setTurnstileToken={setTurnstileToken} />
        )}

        {error && (
          <p role="alert" className="rounded-[12px] bg-[var(--hc-danger-bg)] px-[14px] py-3 text-[13px] font-medium text-hc-danger">{error}</p>
        )}
      </div>

      <div className="bg-hc-n-0 px-4 pb-6 pt-3 lg:rounded-[16px] lg:px-4">
        <button
          type="submit"
          disabled={sending || uploading || turnstileBloqueaSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0 disabled:opacity-50"
        >
          {sending ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-hc-n-0/30 border-t-hc-n-0" />
              {t('serviciosPage.sending')}
            </>
          ) : (
            <>
              <IcoSrv nombre="enviarChat" size={18} />
              {etiquetaEnviar ?? t('serviciosPage.submit')}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'
import { BOTON_HOJA_PRIMARIO, BOTON_HOJA_SECUNDARIO } from '@/components/ui/sistema/estilosHoja'

export type PromoWelcomeStatus = 'idle' | 'loading' | 'success' | 'error'

type PromoWelcomeFormProps = {
  email: string
  setEmail: Dispatch<SetStateAction<string>>
  status: PromoWelcomeStatus
  errorMsg: string
  setStatus: Dispatch<SetStateAction<PromoWelcomeStatus>>
  setErrorMsg: Dispatch<SetStateAction<string>>
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  dismiss: () => void
}

/**
 * Cuerpo de la hoja "Cupón de bienvenida" (Figma `51:2168`): descuento, texto, campo de correo
 * y los botones "No gracias" / "Recibir mi cupón".
 */
export default function PromoWelcomeForm({
  email,
  setEmail,
  status,
  errorMsg,
  setStatus,
  setErrorMsg,
  handleSubmit,
  dismiss,
}: PromoWelcomeFormProps) {
  const { t } = useTranslation()
  const cargando = status === 'loading'

  return (
    <>
      <div className="flex flex-col items-center gap-[2px] rounded-[14px] bg-hc-n-50 px-[10px] py-[14px]">
        <p className="font-display text-[18px] font-bold leading-[23px] tracking-normal text-hc-red-500">{t('promo.discount')}</p>
        <p className="text-[12px] leading-4 text-hc-n-600">{t('promo.firstPurchase')}</p>
      </div>
      <p className="text-[12px] leading-4 text-hc-n-600">{t('promo.subtitle')}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
        <div className="flex flex-col gap-1">
          <label className={`flex items-center gap-2 rounded-[12px] border bg-hc-n-0 p-3 ${errorMsg ? 'border-hc-red-500' : 'border-hc-n-200'}`}>
            <img src={ICONOS_ESTADOS.promoCorreo} alt="" width={16} height={16} className="block size-4 shrink-0" />
            <input
              id="promo-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setErrorMsg('') }}
              placeholder={t('promo.emailPlaceholder')}
              aria-label={t('promo.emailPlaceholder')}
              required
              disabled={cargando}
              className="h-4 min-w-0 flex-1 bg-transparent p-0 text-[14px] leading-4 text-hc-n-900 outline-none placeholder:text-hc-n-500"
            />
          </label>
          {errorMsg && <p role="alert" className="text-[12px] leading-4 text-hc-red-500">{errorMsg}</p>}
        </div>

        <div className="flex gap-[10px]">
          <button type="button" onClick={dismiss} className={BOTON_HOJA_SECUNDARIO}>{t('promo.noThanks')}</button>
          <button type="submit" disabled={cargando || !email.trim()} className={BOTON_HOJA_PRIMARIO}>
            {cargando ? t('promo.sending') : t('promo.getCoupon')}
          </button>
        </div>
      </form>
    </>
  )
}

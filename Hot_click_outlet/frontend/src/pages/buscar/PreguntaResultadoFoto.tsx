import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import TurnstileCampo from '@/components/security/TurnstileCampo'
import { useTurnstileForm } from '@/hooks/useTurnstileForm'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'
import { SolicitudFotoError, enviarSolicitudDesdeFoto } from './solicitudDesdeFoto'

export type PasoResultadoFoto = 'producto' | 'solicitud' | 'enviando' | 'enviada' | 'esEste' | 'cerrada'

const BOTON = 'flex h-12 flex-1 items-center justify-center rounded-[12px] px-4 text-[14px] font-semibold leading-[normal] transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--hc-blue-100)] disabled:opacity-60'
const PRIMARIO = `${BOTON} bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600`
const SECUNDARIO = `${BOTON} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:border-hc-n-400`

type Props = {
  paso: PasoResultadoFoto
  /** Sin productos parecidos la pregunta va directo a la solicitud. */
  sinParecidos: boolean
  /** La foto no se pudo analizar: el texto no dice que el catálogo no lo tiene. */
  analisisFallo?: boolean
  archivo: File | null
  descripcion: string
  nombre: string | null
  onPaso: (paso: PasoResultadoFoto) => void
}

/** Confirmación en la misma pantalla (derivada de la tarjeta de `/buscar/foto`, Figma `27:882`). */
export default function PreguntaResultadoFoto({ paso, sinParecidos, analisisFallo = false, archivo, descripcion, nombre, onPaso }: Props) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const enviandoRef = useRef(false)
  const { turnstileRef, turnstileToken, setTurnstileToken, resetTurnstile, turnstileSiteKey, turnstileBloqueaSubmit } = useTurnstileForm()

  if (paso === 'cerrada') return null

  if (paso === 'enviada') {
    return (
      <p className="flex items-center gap-2 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 text-[14px] font-semibold text-hc-n-900" role="status">
        <IconoFigma src={ICONOS_COMPRADOR.codigoCheck} size={18} className="text-hc-success" />
        {t('search.photoRequestSent')}
      </p>
    )
  }

  if (paso === 'esEste') {
    return <p className="text-[14px] text-hc-n-600" role="status">{t('search.photoMatchYes')}</p>
  }

  const preguntaProducto = paso === 'producto'
  const enviando = paso === 'enviando'
  const titulo = preguntaProducto
    ? t('search.photoAskMatch')
    : t(sinParecidos ? 'search.photoAskRequestEmpty' : 'search.photoAskRequest')
  const detalle = preguntaProducto
    ? t('search.photoAskMatchSub')
    : t(analisisFallo ? 'search.photoAskRequestFailSub' : sinParecidos ? 'search.photoAskRequestEmptySub' : 'search.photoAskRequestSub')

  const mandar = async () => {
    if (!archivo || enviandoRef.current) return
    enviandoRef.current = true
    setError('')
    onPaso('enviando')
    try {
      await enviarSolicitudDesdeFoto(archivo, descripcion, nombre, turnstileToken)
      resetTurnstile()
      onPaso('enviada')
    } catch (err: unknown) {
      enviandoRef.current = false
      resetTurnstile()
      setError(err instanceof SolicitudFotoError ? t('search.photoRequestError') : mensajeErrorApi(err, t('search.photoRequestError')))
      onPaso('solicitud')
    }
  }

  return (
      <section className="flex scroll-mb-64 flex-col gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4" aria-live="polite">
      <h2 className="font-display text-[15px] font-bold text-hc-n-900">{titulo}</h2>
      <p className="text-[13px] leading-[18px] text-hc-n-600">{detalle}</p>
      {error && <p role="alert" className="rounded-[12px] bg-hc-danger-bg px-3 py-[10px] text-[13px] text-hc-danger">{error}</p>}
      {!preguntaProducto && turnstileBloqueaSubmit && (
        <p className="text-[12px] leading-[17px] text-hc-n-600">{t('search.photoRequestChecking')}</p>
      )}
      {!preguntaProducto && (
        <TurnstileCampo siteKey={turnstileSiteKey} turnstileRef={turnstileRef} setTurnstileToken={setTurnstileToken} />
      )}
      <div className="flex gap-[10px]">
        {preguntaProducto ? (
          <>
            <button type="button" className={PRIMARIO} onClick={() => onPaso('esEste')}>{t('search.photoAskMatchYes')}</button>
            <button type="button" className={SECUNDARIO} onClick={() => onPaso('solicitud')}>{t('search.photoAskMatchNo')}</button>
          </>
        ) : (
          <>
            <button type="button" className={PRIMARIO} disabled={enviando || turnstileBloqueaSubmit || !archivo} onClick={() => { void mandar() }}>
              {enviando ? t('search.photoRequestSending') : t('search.photoAskRequestYes')}
            </button>
            <button type="button" className={SECUNDARIO} disabled={enviando} onClick={() => onPaso('cerrada')}>{t('search.photoAskRequestNo')}</button>
          </>
        )}
      </div>
    </section>
  )
}

import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import { ICONOS_ESTADOS } from './iconosEstados'
import { WHATSAPP_SOPORTE_VISIBLE, enlaceWhatsappSoporte } from './falloServidorHelpers'

type PantallaFalloServidorProps = {
  /** Referencia corta del error que el comprador comparte con soporte. */
  referencia: string
  onReintentar: () => void
}

const BOTON = 'flex w-full items-center justify-center gap-2 rounded-[12px] py-[14px] text-[15px] font-semibold leading-[normal]'

/**
 * Fallo del servidor del comprador (Figma `45:2322`): barra mínima sin depender
 * de la API, mensaje, Reintentar, WhatsApp de soporte y referencia del error.
 */
export default function PantallaFalloServidor({ referencia, onReintentar }: PantallaFalloServidorProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { key } = useLocation()
  /** Si se entró directo a esta URL no hay historial propio: volver lleva al Inicio. */
  const volver = () => (key === 'default' ? navigate('/') : navigate(-1))

  return (
    <div className="flex min-h-screen flex-col bg-hc-n-0">
      <header className="border-b border-hc-n-200 bg-hc-n-0 px-4 py-[14px]">
        <div className="flex items-center gap-3">
          <button type="button" onClick={volver} aria-label={t('comprador.falloServidor.volver')} className="flex text-hc-n-900">
            <IconoFigma src={ICONOS_COMPRADOR.falloVolver} size={22} />
          </button>
          <p className="flex-1 font-display text-[17px] font-bold leading-[normal] tracking-normal text-hc-n-900">{t('comprador.falloServidor.marca')}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md">
        <section className="flex flex-col items-center gap-3 px-5 pb-2 pt-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-hc-warning-bg text-hc-warning">
            <img src={ICONOS_ESTADOS.alertaServidor} alt="" width={28.16} height={28.16} />
          </span>
          <h1 className="font-display text-[20px] font-bold leading-[normal] tracking-normal text-hc-n-900 [text-wrap:balance]">{t('comprador.falloServidor.titulo')}</h1>
          <p className="text-[14px] leading-5 text-hc-n-600">{t('comprador.falloServidor.texto')}</p>
        </section>

        <div className="flex flex-col gap-3 px-5 pb-2 pt-3">
          <button type="button" onClick={onReintentar} className={`${BOTON} bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600`}>
            <IconoFigma src={ICONOS_COMPRADOR.falloReintentar} size={18} />
            {t('comprador.falloServidor.reintentar')}
          </button>
          <a
            href={enlaceWhatsappSoporte(t('comprador.falloServidor.mensajeWhatsapp', { referencia }))}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BOTON} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50`}
          >
            <IconoFigma src={ICONOS_COMPRADOR.falloWhatsapp} size={18} />
            {t('comprador.falloServidor.whatsapp', { numero: WHATSAPP_SOPORTE_VISIBLE })}
          </a>
          <p className="text-center font-mono text-[11px] font-medium leading-[15px] text-hc-n-600">
            {t('comprador.falloServidor.referencia', { referencia })}
          </p>
        </div>
      </main>
    </div>
  )
}

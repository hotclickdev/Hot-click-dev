import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'
import Interruptor from '@/components/ui/sistema/Interruptor'

type HojaPreferenciasCookiesProps = {
  abierta: boolean
  /** Valor inicial del interruptor de análisis (consentimiento guardado, o activo si no hay). Quien la usa debe darle `key={abierta}` para que se reinicie al abrir. */
  analiticaInicial: boolean
  onCerrar: () => void
  onGuardar: (analitica: boolean) => void
  onAceptarTodo: () => void
}

const FILA = 'flex flex-col gap-[6px] border-t border-hc-n-200 px-5 py-[14px]'
const TITULO_FILA = 'flex-1 text-[15px] font-semibold leading-[18px] text-hc-n-900'
const DESCRIPCION = 'text-[12px] leading-[17px] text-hc-n-600'
const BOTON = 'flex w-full items-center justify-center rounded-[12px] py-[14px] text-[15px] font-semibold leading-[18px]'

/**
 * Preferencias de cookies (Figma `45:2166`): hoja que arranca a 90 px del borde superior, con
 * esenciales (siempre activas), análisis (interruptor) y publicidad (no se usa).
 */
export default function HojaPreferenciasCookies({ abierta, analiticaInicial, onCerrar, onGuardar, onAceptarTodo }: HojaPreferenciasCookiesProps) {
  const { t } = useTranslation()
  const idTitulo = useId()
  const hojaRef = useRef<HTMLDivElement>(null)
  const [analitica, setAnalitica] = useState(analiticaInicial)

  // El foco entra en la hoja, Tab no sale de ella y al cerrar vuelve a quien la abrió.
  useFocusTrap(hojaRef, abierta, 'contenedor')

  useEffect(() => {
    if (!abierta) return undefined
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    globalThis.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = overflowPrevio
      globalThis.removeEventListener('keydown', alTeclear)
    }
  }, [abierta, onCerrar])

  if (!abierta) return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
      <button type="button" aria-label={t('cookies.cerrarPreferencias')} onClick={onCerrar} className="absolute inset-0 bg-hc-n-900" />
      <div
        ref={hojaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="relative mx-auto flex h-[calc(100dvh-90px)] w-full max-w-[480px] flex-col overflow-y-auto rounded-t-[22px] bg-hc-n-0 outline-none"
      >
        <div className="flex flex-col gap-1 px-5 pb-[6px] pt-5">
          <h2 id={idTitulo} className="font-display text-[18px] font-bold leading-[23px] tracking-normal text-hc-n-900">{t('cookies.preferenciasTitulo')}</h2>
          <p className="text-[13px] leading-[18px] text-hc-n-600">{t('cookies.preferenciasSubtitulo')}</p>
        </div>

        <section className={FILA}>
          <div className="flex items-center gap-[10px]">
            <h3 className={`${TITULO_FILA} font-sans tracking-normal`}>{t('cookies.esenciales')}</h3>
            <span className="flex items-center gap-1 text-[12px] font-semibold leading-[normal] text-hc-success-text">
              <img src={ICONOS_ESTADOS.cookiesSiempreActivas} alt="" width={12} height={12} />
              {t('cookies.siempreActivas')}
            </span>
          </div>
          <p className={DESCRIPCION}>{t('cookies.esencialesDesc')}</p>
        </section>

        <section className={FILA}>
          <div className="flex items-center gap-[10px]">
            <h3 className={`${TITULO_FILA} font-sans tracking-normal`}>{t('cookies.analisis')}</h3>
            <Interruptor tamano="cookies" activo={analitica} onCambio={setAnalitica} etiqueta={t('cookies.analisis')} />
          </div>
          <p className={DESCRIPCION}>{t('cookies.analisisDesc')}</p>
        </section>

        <section className={FILA}>
          <div className="flex items-center gap-[10px]">
            <h3 className={`${TITULO_FILA} font-sans tracking-normal`}>{t('cookies.publicidad')}</h3>
            <span className="text-[12px] font-semibold leading-[normal] text-hc-n-600">{t('cookies.noLasUsamos')}</span>
          </div>
          <p className={DESCRIPCION}>{t('cookies.publicidadDesc')}</p>
        </section>

        <div className="flex-1" />

        <div className="flex flex-col gap-[10px] border-t border-hc-n-200 px-5 pb-7 pt-3">
          <button type="button" onClick={() => onGuardar(analitica)} className={`${BOTON} bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600`}>
            {t('cookies.guardarPreferencias')}
          </button>
          <button type="button" onClick={onAceptarTodo} className={`${BOTON} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50`}>
            {t('cookies.acceptAll')}
          </button>
          <p className="text-[11px] leading-[15px] text-hc-n-600">
            {t('cookies.leyTexto')}{' '}
            <Link to="/cookies" onClick={onCerrar} className="underline underline-offset-2">{t('cookies.verPolitica')}</Link>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

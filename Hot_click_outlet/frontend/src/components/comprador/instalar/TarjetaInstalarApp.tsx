import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import isotipo from '@/assets/figma/comprador/isotipo.png'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import { useTarjetaInstalar } from './useTarjetaInstalar'

const BENEFICIOS = [
  { icono: ICONOS_COMPRADOR.instalarRayo, clave: 'comprador.instalarApp.beneficioAcceso' },
  { icono: ICONOS_COMPRADOR.instalarCampana, clave: 'comprador.instalarApp.beneficioAvisos' },
  { icono: ICONOS_COMPRADOR.instalarSinConexion, clave: 'comprador.instalarApp.beneficioSinConexion' },
] as const

const BOTON = 'flex min-w-0 flex-1 items-center justify-center rounded-[12px] py-3 text-[14px] font-semibold'

/**
 * Tarjeta flotante "Instalá HotClick" del Home móvil (Figma `55:2658`), sobre la
 * barra inferior. Solo aparece si el navegador ofrece instalar la app.
 */
export default function TarjetaInstalarApp() {
  const { t } = useTranslation()
  const { visible, instalar, descartar } = useTarjetaInstalar()
  if (!visible) return null

  // Portal: el fade de página (PageFade) crea un contexto de apilamiento que dejaría
  // la tarjeta debajo de los botones flotantes globales.
  return createPortal(
    <section
      aria-label={t('comprador.instalarApp.aria')}
      className="fixed inset-x-4 bottom-[89px] z-[55] flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.16)] lg:hidden"
    >
      <div className="flex items-center gap-3">
        <span className="size-11 shrink-0 overflow-hidden rounded-[12px] border border-hc-n-200">
          <img src={isotipo} alt="" className="size-full object-contain" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-display text-[16px] font-bold text-hc-n-900">{t('comprador.instalarApp.titulo')}</h2>
          <p className="text-[12px] text-hc-n-500">{t('comprador.instalarApp.subtitulo')}</p>
        </div>
        <button type="button" onClick={descartar} aria-label={t('comprador.instalarApp.cerrar')} className="text-hc-n-500">
          <IconoFigma src={ICONOS_COMPRADOR.instalarCerrar} size={18} />
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {BENEFICIOS.map((b) => (
          <li key={b.clave} className="flex items-center gap-2.5 text-[13px] text-hc-n-600">
            <IconoFigma src={b.icono} size={16} className="text-hc-blue-600" />
            <span className="min-w-0 flex-1">{t(b.clave)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2.5">
        <button type="button" onClick={descartar} className={`${BOTON} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50`}>
          {t('comprador.instalarApp.ahoraNo')}
        </button>
        <button type="button" onClick={() => { void instalar() }} className={`${BOTON} gap-1.5 bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600`}>
          <IconoFigma src={ICONOS_COMPRADOR.instalarDescargar} size={16} />
          {t('comprador.instalarApp.instalar')}
        </button>
      </div>
    </section>,
    document.body,
  )
}

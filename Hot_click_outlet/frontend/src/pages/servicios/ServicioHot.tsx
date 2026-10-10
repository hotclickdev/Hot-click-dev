import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { VistaServicios } from './serviciosHelpers'
import { IcoSrv } from './IcoSrv'
import { OPCIONES } from './opcionesServicios'

const CLASE_FORM_CTA_FIJA = 'lg:sticky lg:top-24 [&_button[type=submit]]:max-lg:fixed [&_button[type=submit]]:max-lg:inset-x-4 [&_button[type=submit]]:max-lg:bottom-[calc(12px+env(safe-area-inset-bottom,0px))] [&_button[type=submit]]:max-lg:z-30 [&_button[type=submit]]:max-lg:w-auto [&_button[type=submit]]:max-lg:min-h-[48px]'

type Props = {
  vista: Exclude<VistaServicios, 'inicio'>
  /** Tres pasos cortos del servicio (provisorios hasta copy de Producto). */
  pasos: [string, string, string]
  irA: (v: VistaServicios) => void
  /** El botón de enviar del formulario queda fijo abajo en móvil (solo vistas con un único formulario). */
  ctaFija?: boolean
  children: ReactNode
}

/**
 * Plantilla común de los 4 servicios HOT (boceto demo-0410 · 01): ícono, título y una frase; 3 pasos;
 * formulario. A 1440, dos columnas con el formulario fijo a la derecha y «Otros servicios» a la izquierda.
 * La única CTA roja es la del formulario (fija abajo en móvil).
 */
export default function ServicioHot({ vista, pasos, irA, ctaFija = false, children }: Props) {
  const { t } = useTranslation()
  const opcion = OPCIONES.find((o) => o.vista === vista)
  const otros = OPCIONES.filter((o) => o.vista !== vista)
  return (
    <div className="flex flex-col pb-24 lg:mx-auto lg:grid lg:w-full lg:max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-8 lg:pb-10 lg:pt-6">
      <div className="flex flex-col gap-4 bg-hc-n-0 px-4 py-5 lg:rounded-[16px] lg:p-6">
        {opcion && (
          <div className="flex items-center gap-3">
            <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-[14px] ${opcion.fondo}`}>
              <IcoSrv nombre={opcion.icono} size={26} />
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="font-display text-[20px] font-bold leading-tight text-hc-n-900 lg:text-[26px]">{t(opcion.titulo)}</p>
              <p className="text-[14px] leading-5 text-hc-n-600">{t(opcion.detalle)}</p>
            </div>
          </div>
        )}
        <ol className="grid grid-cols-3 gap-2">
          {pasos.map((p, i) => (
            <li key={p} className="flex flex-col gap-1 rounded-[12px] border border-hc-n-200 p-2.5 lg:p-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-hc-blue-50 text-[12px] font-bold text-hc-blue-600">{i + 1}</span>
              <span className="text-[12px] font-semibold leading-4 text-hc-n-900 lg:text-[13px]">{p}</span>
            </li>
          ))}
        </ol>
        <nav aria-label="Otros servicios" className="hidden flex-col gap-2 lg:flex">
          <p className="text-[14px] font-semibold text-hc-n-900">Otros servicios</p>
          <div className="grid grid-cols-3 gap-2">
            {otros.map((o) => (
              <button key={o.vista} type="button" onClick={() => irA(o.vista)} className="flex min-h-[44px] items-center gap-2 rounded-[12px] border border-hc-n-200 p-2.5 text-left text-[13px] font-medium text-hc-n-900">
                <IcoSrv nombre={o.icono} size={18} />
                {t(o.titulo)}
              </button>
            ))}
          </div>
        </nav>
      </div>
      <div className={ctaFija ? CLASE_FORM_CTA_FIJA : 'lg:sticky lg:top-24'}>
        {children}
      </div>
    </div>
  )
}

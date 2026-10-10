import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IcoSrv } from './IcoSrv'
import { OPCIONES } from './opcionesServicios'
import type { VistaServicios } from './serviciosHelpers'

type ServiciosInicioProps = {
  irA: (destino: VistaServicios) => void
  /** Solicitudes de búsqueda que siguen abiertas; 0 oculta el aviso. */
  solicitudesEnCurso: number
}

/** Inicio de Servicios HOT: introducción, cuatro opciones en lista y aviso de solicitudes en curso (Figma `28:1429`). */
export default function ServiciosInicio({ irA, solicitudesEnCurso }: ServiciosInicioProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col leading-[normal] lg:mx-auto lg:w-full lg:max-w-[560px]">
      <section className="flex flex-col gap-[6px] bg-hc-n-0 px-4 py-5 lg:rounded-[16px] lg:mt-6">
        <h1 className="leading-[normal] font-display text-[22px] font-bold text-hc-n-900">{t('serviciosPage.inicio.titulo')}</h1>
        <p className="text-[14px] leading-5 text-hc-n-600">
          {t('serviciosPage.inicio.intro')}
        </p>
      </section>

      <div className="flex flex-col gap-3 px-4 pb-6 pt-4 lg:px-0">
        {OPCIONES.map((o) => (
          <button
            key={o.vista}
            type="button"
            onClick={() => irA(o.vista)}
            className="flex w-full items-center gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-[14px] text-left"
          >
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-[12px] ${o.fondo}`}>
              <IcoSrv nombre={o.icono} size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="text-[15px] font-semibold text-hc-n-900">{t(o.titulo)}</span>
              <span className="text-[12px] leading-4 text-hc-n-600">{t(o.detalle)}</span>
            </span>
            <IcoSrv nombre="inicioFlecha" size={18} />
          </button>
        ))}

        {solicitudesEnCurso > 0 && (
          <Link
            to="/servicios?vista=solicitudes"
            className="flex items-center gap-[10px] rounded-[16px] bg-hc-blue-50 p-4"
          >
            <IcoSrv nombre="inicioReloj" size={20} />
            <span className="min-w-0 flex-1 text-[14px] font-semibold text-hc-blue-600">
              {t('serviciosPage.inicio.enCurso', { count: solicitudesEnCurso })}
            </span>
            <IcoSrv nombre="inicioFlechaAzul" size={16} />
          </Link>
        )}
      </div>
    </div>
  )
}

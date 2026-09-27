import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import ConsultaRotativa from '@/components/comprador/ConsultaRotativa'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { CONSULTAS_ASISTENTE } from '../homeCompraHelpers'

type TarjetaAsistenteProps = {
  variante: 'hero' | 'seccion'
  onPreguntar: (texto: string) => void
  className?: string
}

/**
 * Tarjeta del asistente: consultas de ejemplo + campo con pregunta rotativa.
 * `hero` es la versión compacta del hero desktop (`9:249`); `seccion` la de móvil (`7:210`).
 */
export default function TarjetaAsistente({ variante, onPreguntar, className = '' }: TarjetaAsistenteProps) {
  const { t } = useTranslation()
  const completa = variante === 'seccion'

  return (
    <div className={`flex flex-col gap-[10px] rounded-[16px] bg-hc-blue-50 p-4 ${completa ? 'gap-3 rounded-[18px]' : ''} ${className}`}>
      {completa ? (
        <>
          <div className="flex items-center gap-[10px]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hc-blue-600 text-hc-n-0">
              <IconoFigma src={ICONOS_COMPRADOR.asistente} size={18} />
            </span>
            <h2 className="font-display text-[17px] font-bold text-hc-n-900">{t('home.compra.asistenteTitulo')}</h2>
          </div>
          <p className="text-[13px] leading-[19px] text-hc-n-600">{t('home.compra.asistenteTexto')}</p>
        </>
      ) : (
        <p className="flex items-center gap-2 text-[14px] font-semibold text-hc-blue-600">
          <IconoFigma src={ICONOS_COMPRADOR.chipAsistente} size={18} />
          {t('home.compra.asistenteHero')}
        </p>
      )}

      <ul className="flex flex-col gap-[10px]">
        {CONSULTAS_ASISTENTE.map((clave) => {
          const texto = t(clave)
          return (
            <li key={clave}>
              <button
                type="button"
                onClick={() => onPreguntar(texto)}
                className={`flex w-full items-center gap-2 rounded-[10px] bg-hc-n-0 pl-[14px] pr-[10px] text-left text-[14px] font-medium text-hc-n-900 ${completa ? 'rounded-[12px] py-3' : 'py-[10px]'}`}
              >
                <span className="min-w-0 flex-1">{texto}</span>
                <IconoFigma src={ICONOS_COMPRADOR.consultaFlecha} size={16} className="text-hc-blue-600" />
              </button>
            </li>
          )
        })}
      </ul>

      <ConsultaRotativa onEnviar={onPreguntar} />

      {completa && (
        <Link to="/descubri" className="flex items-center gap-1 text-[13px] font-semibold text-hc-blue-600">
          {t('home.compra.descubri')}
          <IconoFigma src={ICONOS_COMPRADOR.verTodo} size={14} />
        </Link>
      )}
    </div>
  )
}

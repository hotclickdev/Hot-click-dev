import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import { puedeVolverAtras } from './headerHelpers'
import type { DatosBarraInterna } from './tiposHeader'

/**
 * Barra superior de las pantallas internas en móvil: flecha atrás + título (Figma `28:1144`, `27:941`).
 * Sin destino explícito vuelve en el historial; si la pantalla se abrió directo, cae en el Home.
 */
export default function BarraInterna({ titulo, atras, acciones }: DatosBarraInterna) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const volver = () => {
    if (typeof atras === 'function') atras()
    else if (typeof atras === 'string') navigate(atras)
    else if (puedeVolverAtras(window.history.state)) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="flex items-center gap-3 border-b border-hc-n-200 bg-hc-n-0 px-4 py-[14px] leading-[normal] lg:hidden">
      <button
        type="button"
        onClick={volver}
        aria-label={t('comprador.header.volver')}
        className="flex shrink-0 text-hc-n-900"
      >
        <IconoFigma src={ICONOS_COMPRADOR.barraAtras} size={22} />
      </button>
      <p className="min-w-0 flex-1 truncate font-display text-[17px] font-bold text-hc-n-900">{titulo}</p>
      {acciones}
    </div>
  )
}

import { Fragment, useState, type CSSProperties, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'
import { useRotacionConsulta } from './useRotacionConsulta'
import {
  CLAVES_PREGUNTAS,
  DURACION_PALABRA_MS,
  SALIDA_PREGUNTA_MS,
  escalonPalabra,
  palabrasDe,
} from './consultaRotativaHelpers'

type ConsultaRotativaProps = {
  onEnviar: (texto: string) => void
  className?: string
}

/** Campo del asistente con pregunta rotativa en escalera (Figma `23:820`, nota `23:846`). */
export default function ConsultaRotativa({ onEnviar, className = '' }: ConsultaRotativaProps) {
  const { t } = useTranslation()
  const [enfocada, setEnfocada] = useState(false)
  const [valor, setValor] = useState('')
  const muestraPregunta = !enfocada && valor === ''
  const { indice, saliendo } = useRotacionConsulta(CLAVES_PREGUNTAS.length, muestraPregunta)
  const pregunta = t(CLAVES_PREGUNTAS[indice])

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    onEnviar(valor.trim() || pregunta)
  }

  return (
    <form
      onSubmit={enviar}
      className={`flex h-12 items-center gap-[10px] rounded-[12px] border-[1.5px] border-hc-blue-600 bg-hc-n-0 py-[6px] pl-[14px] pr-[6px] shadow-[0_0_0_3px_var(--hc-blue-100)] ${className}`}
    >
      <IconoFigma src={ICONOS_COMPRADOR.consultaDestello} size={18} className="text-hc-blue-600" />
      <div className="relative h-[22px] min-w-0 flex-1 overflow-hidden">
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onFocus={() => setEnfocada(true)}
          onBlur={() => setEnfocada(false)}
          placeholder={enfocada ? t('comprador.consulta.enfocada') : ''}
          aria-label={t('comprador.consulta.aria')}
          className="absolute inset-0 w-full bg-transparent text-[14px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
        />
        {muestraPregunta && (
          <button
            type="button"
            onClick={() => onEnviar(pregunta)}
            className="absolute inset-0 whitespace-nowrap text-left text-[14px] font-semibold text-hc-blue-600 transition-opacity ease-out motion-reduce:transition-none"
            style={{ opacity: saliendo ? 0 : 1, transitionDuration: `${SALIDA_PREGUNTA_MS}ms` }}
          >
            <FraseEscalera key={indice} texto={pregunta} />
          </button>
        )}
      </div>
      <button
        type="submit"
        aria-label={t('comprador.consulta.enviar')}
        className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-hc-blue-600 text-hc-n-0"
      >
        <IconoFigma src={ICONOS_COMPRADOR.enviarFlecha} size={16} />
      </button>
    </form>
  )
}

function FraseEscalera({ texto }: { texto: string }) {
  return (
    <>
      {palabrasDe(texto).map((palabra, i) => {
        const { desdePx, retrasoMs } = escalonPalabra(i)
        const estilo = {
          '--hc-escalon-desde': `${desdePx}px`,
          animationDuration: `${DURACION_PALABRA_MS}ms`,
          animationDelay: `${retrasoMs}ms`,
        } as CSSProperties
        return (
          <Fragment key={`${palabra}-${i}`}>
            <span className="hc-escalon-palabra" style={estilo}>{palabra}</span>{' '}
          </Fragment>
        )
      })}
    </>
  )
}

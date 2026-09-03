import { useState, type ReactNode } from 'react'
import {
  type PasoFormulario,
  esPrimerPaso,
  esUltimoPaso,
  etiquetaProgreso,
  indicePasoValido,
  pasoAnterior,
  siguientePasoSiValido,
} from './formularioPorPasosHelpers'

type Props = Readonly<{
  pasos: readonly PasoFormulario[]
  pasoActual: number
  onPasoChange: (paso: number) => void
  /** null = ok; string = mensaje de error que bloquea el avance */
  validarPaso: (paso: number) => string | null
  onFinalizar: () => void | Promise<void>
  etiquetaFinal: string
  enviando?: boolean
  children: ReactNode
  /** Si true, no muestra Atrás en el primer paso (útil cuando hay CabeceraAtras afuera). */
  ocultarAtrasEnPrimero?: boolean
  /** Desplaza el número visible (ej. tipo ya contó como paso 1). */
  progresoOffset?: number
  /** Total visible en la barra; por defecto pasos.length + offset. */
  totalProgreso?: number
}>

/**
 * Shell conversacional: una sección por paso, barra de progreso y Continuar/Guardar.
 */
export default function FormularioPorPasos({
  pasos,
  pasoActual,
  onPasoChange,
  validarPaso,
  onFinalizar,
  etiquetaFinal,
  enviando = false,
  children,
  ocultarAtrasEnPrimero = true,
  progresoOffset = 0,
  totalProgreso,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const total = pasos.length
  const indice = indicePasoValido(pasoActual, total)
  const paso = pasos[indice]
  const ultimo = esUltimoPaso(indice, total)
  const primero = esPrimerPaso(indice)
  const totalBarra = totalProgreso ?? total + progresoOffset
  const indiceBarra = indice + progresoOffset

  async function continuar() {
    if (enviando) return
    const fallo = validarPaso(indice)
    if (fallo) {
      setError(fallo)
      return
    }
    setError(null)
    if (ultimo) {
      await onFinalizar()
      return
    }
    onPasoChange(siguientePasoSiValido(indice, total, null))
  }

  function atras() {
    if (enviando || primero) return
    setError(null)
    onPasoChange(pasoAnterior(indice))
  }

  return (
    <div className="flex flex-col gap-5">
      <ProgresoPasos
        indice={indiceBarra}
        total={totalBarra}
        titulo={paso?.titulo}
        opcional={paso?.opcional}
      />

      <div className="flex flex-col gap-4">{children}</div>

      {error ? <p className="text-sm text-hc-danger">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={enviando}
          onClick={() => void continuar()}
          className="flex min-h-11 w-full items-center justify-center rounded-[14px] bg-hc-primary px-5 py-4 text-[15px] font-bold text-white disabled:opacity-60"
        >
          {enviando ? 'Guardando…' : ultimo ? etiquetaFinal : 'Continuar'}
        </button>
        {!primero || !ocultarAtrasEnPrimero ? (
          <button
            type="button"
            disabled={enviando || primero}
            onClick={atras}
            className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border py-3.5 text-[13px] font-medium text-hc-text disabled:opacity-40"
          >
            Atrás
          </button>
        ) : null}
      </div>
    </div>
  )
}

function colorBarra(idx: number, actual: number): string {
  if (idx < actual) return 'var(--hc-accent)'
  if (idx === actual) return 'rgba(23,71,168,0.5)'
  return 'var(--hc-border)'
}

type ProgresoProps = Readonly<{
  indice: number
  total: number
  titulo?: string
  opcional?: boolean
}>

/** Barra de progreso reutilizable (también fuera del shell, p. ej. elegir tipo). */
export function ProgresoPasos({ indice, total, titulo, opcional }: ProgresoProps) {
  const seguro = Math.max(total, 1)
  const actual = indicePasoValido(indice, seguro)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-hc-muted">{etiquetaProgreso(actual, seguro)}</span>
        {opcional ? (
          <span className="rounded-full border border-hc-border bg-hc-surface-2 px-2 py-0.5 text-[10px] text-hc-muted">
            Opcional
          </span>
        ) : null}
      </div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={actual + 1}
        aria-valuemin={1}
        aria-valuemax={seguro}
      >
        {Array.from({ length: seguro }, (_, idx) => (
          <div
            key={idx}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: colorBarra(idx, actual) }}
          />
        ))}
      </div>
      {titulo ? <h2 className="text-lg font-bold text-hc-text">{titulo}</h2> : null}
    </div>
  )
}

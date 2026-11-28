import { useState } from 'react'
import { anchoBarra, VERIFICAR } from './contador'
import { BOTON_SECUNDARIO } from './piezas'

/** Etiqueta para todo valor que el dueño configuró y nadie verificó. */
export function EtiquetaVerificar() {
  return (
    <span className="inline-flex rounded-full bg-hc-warning-bg px-2 py-0.5 text-[11px] font-semibold text-hc-n-900">
      {VERIFICAR}
    </span>
  )
}

export function BarraProgreso({ pct, etiqueta, superado }: { pct: number; etiqueta: string; superado?: boolean }) {
  const ancho = anchoBarra(pct)
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-hc-n-600">
        <span>{etiqueta}</span>
        <span className="font-semibold text-hc-n-900">{String(pct).replace('.', ',')} %</span>
      </div>
      <div
        className="mt-1 h-2.5 overflow-hidden rounded-full bg-hc-n-100"
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ancho}
      >
        <div className={`h-full rounded-full ${superado ? 'bg-hc-primary' : 'bg-hc-blue-600'}`} style={{ width: `${ancho}%` }} />
      </div>
    </div>
  )
}

/** Copia un texto al portapapeles. Nunca envía nada a ningún lado. */
export function BotonCopiar({ texto, etiqueta = 'Copiar' }: { texto: string; etiqueta?: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1500)
    } catch (err) {
      console.error(err)
    }
  }
  return (
    <button type="button" className={`${BOTON_SECUNDARIO} h-9 px-3 text-xs`} onClick={copiar} aria-label={`${etiqueta}: ${texto.slice(0, 40)}`}>
      {copiado ? 'Copiado' : etiqueta}
    </button>
  )
}

export function AvisoLegal({ texto }: { texto: string }) {
  return (
    <p role="note" className="rounded-xl border border-hc-blue-100 bg-hc-blue-50 px-3 py-2 text-sm font-semibold text-hc-blue-600">
      {texto}
    </p>
  )
}

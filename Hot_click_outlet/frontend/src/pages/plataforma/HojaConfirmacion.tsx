import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { BOTON_PRIMARIO } from './piezas'

type TeclaFondo = Pick<KeyboardEvent<HTMLDivElement>, 'key' | 'stopPropagation'>
type ClicFondo = Pick<MouseEvent<HTMLDivElement>, 'target' | 'currentTarget'>

/** Handlers del fondo: Esc cierra (el foco vive dentro del diálogo y burbujea) y solo un clic directo en el fondo cierra. */
export function manejadoresFondo(onCancelar: () => void) {
  return {
    alTeclear: (e: TeclaFondo) => { if (e.key === 'Escape') { e.stopPropagation(); onCancelar() } },
    alClicFondo: (e: ClicFondo) => { if (e.target === e.currentTarget) onCancelar() },
  }
}

/** Confirmación: hoja abajo en 390, modal en 1440. Foco inicial en Cancelar; Esc cierra. La CTA roja vive solo acá. */
export function HojaConfirmacion({ titulo, texto, cta, ocupado, onConfirmar, onCancelar }: {
  titulo: string; texto: string; cta: string; ocupado: boolean; onConfirmar: () => void; onCancelar: () => void
}) {
  const cancelar = useRef<HTMLButtonElement>(null)
  useEffect(() => { cancelar.current?.focus() }, [])
  const { alTeclear, alClicFondo } = manejadoresFondo(onCancelar)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" role="presentation" onClick={alClicFondo} onKeyDown={alTeclear}>
      <div role="dialog" aria-modal="true" aria-labelledby="hoja-titulo" className="flex w-full max-w-[440px] flex-col gap-3 rounded-t-[16px] bg-hc-surface p-5 md:rounded-[16px]">
        <h2 id="hoja-titulo" className="font-display text-[18px] font-bold text-hc-n-900">{titulo}</h2>
        <p className="text-sm text-hc-n-900">{texto}</p>
        <button type="button" className={BOTON_PRIMARIO} disabled={ocupado} onClick={onConfirmar}>{cta}</button>
        <button ref={cancelar} type="button" className="inline-flex h-12 items-center justify-center rounded-xl border border-hc-blue-600 px-4 text-[15px] font-semibold text-hc-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hc-blue-600" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  )
}

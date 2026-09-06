import { useState } from 'react'
import {
  mmApagado,
  reiniciarGuiasPantalla,
  setMmApagado,
} from '@/components/ui/mentalModel/mmRegistry'

/**
 * Toggle en Opciones / Cuenta: guías al entrar a cada pestaña.
 */
export default function MmGuiaToggle({ dataMm = 'seller-opciones-guia' }: { dataMm?: string }) {
  const [activo, setActivo] = useState(() => !mmApagado())

  function cambiar(siguiente: boolean) {
    setMmApagado(!siguiente)
    setActivo(siguiente)
    if (siguiente) {
      reiniciarGuiasPantalla()
      globalThis.dispatchEvent(new Event('hc-open-tour'))
    }
  }

  return (
    <div
      className="rounded-xl border border-hc-border bg-hc-surface p-4"
      data-mm={dataMm}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-hc-text">Guías al entrar</p>
          <p className="mt-1 text-xs text-hc-muted">
            Al abrir cada pestaña te explicamos paso a paso qué hacer. No es un tour único al inicio.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          onClick={() => cambiar(!activo)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            activo ? 'bg-hc-primary' : 'bg-[var(--hc-border-strong)]'
          }`}
        >
          <span
            className={`absolute top-0.5 size-6 rounded-full bg-white hc-papel-blanco shadow transition-transform ${
              activo ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>
      {activo ? (
        <button
          type="button"
          className="mt-3 min-h-10 text-xs font-semibold text-hc-primary"
          onClick={() => {
            reiniciarGuiasPantalla()
            globalThis.dispatchEvent(new Event('hc-open-tour'))
          }}
        >
          Volver a ver guías de esta pantalla
        </button>
      ) : null}
    </div>
  )
}

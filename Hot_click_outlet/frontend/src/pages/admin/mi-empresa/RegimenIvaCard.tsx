import { useState } from 'react'

import { REGIMENES_IVA, normalizarRegimenIva, type RegimenIva } from './regimenIva'

type Props = {
  regimen?: string | null
  canEdit: boolean
  onGuardar: (regimen: RegimenIva) => void | Promise<void>
}

/** M4: selector del régimen de IVA del negocio (define cómo se cobra el IVA en checkout y POS). */
export default function RegimenIvaCard({ regimen, canEdit, onGuardar }: Readonly<Props>) {
  const actual = normalizarRegimenIva(regimen)
  const [guardando, setGuardando] = useState(false)

  const elegir = async (valor: RegimenIva) => {
    if (!canEdit || guardando || valor === actual) return
    setGuardando(true)
    try { await onGuardar(valor) } finally { setGuardando(false) }
  }

  return (
    <div className="rounded-2xl p-5 space-y-3"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Régimen de IVA</p>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Elegí el régimen con el que estás inscrito en Hacienda. Si no estás seguro, consultalo con tu contador.
        </p>
      </div>
      <div role="radiogroup" aria-label="Régimen de IVA" className="grid gap-2 sm:grid-cols-2">
        {REGIMENES_IVA.map(r => {
          const activo = r.valor === actual
          return (
            <button
              key={r.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              disabled={!canEdit || guardando}
              onClick={() => { void elegir(r.valor) }}
              className="rounded-xl p-3 text-left transition-colors disabled:cursor-not-allowed"
              style={{
                border: `1px solid ${activo ? 'var(--hc-primary)' : 'var(--hc-border)'}`,
                backgroundColor: activo ? 'var(--hc-primary-soft, transparent)' : 'transparent',
              }}
            >
              <span className="block text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{r.titulo}</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{r.detalle}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

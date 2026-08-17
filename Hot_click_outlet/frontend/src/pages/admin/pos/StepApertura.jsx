import { useState } from 'react'
import ConteoEfectivo from './ConteoEfectivo'
import { formatMontoPos } from './posHelpers'

export default function StepApertura({ onAbrir, loading }) {
  const [monto, setMonto] = useState(0)

  return (
    <div className="flex-1 overflow-y-auto flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-6 pt-2">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
              style={{ backgroundColor: 'rgba(52,211,153,0.2)' }}>1</span>
            <span>Paso 1 de 3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: '#fff' }}>Abrí el turno</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Contá el efectivo inicial de la caja antes de empezar a vender
          </p>
        </div>

        <div className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ConteoEfectivo label="Efectivo en caja al inicio" onTotal={setMonto} />
        </div>

        <button type="button"
          onClick={() => onAbrir(monto)}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-black text-base transition-all hover:brightness-110 disabled:opacity-40"
          style={{ background: 'var(--hc-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(23,71,168,0.4)' }}>
          {etiquetaAbrirTurno(loading, monto)}
        </button>

        <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          El monto inicial queda registrado en el cuadre de caja
        </p>
      </div>
    </div>
  )
}

function etiquetaAbrirTurno(loading, monto) {
  if (loading) return 'Abriendo turno…'
  const extra = monto > 0 ? ` — ₡${formatMontoPos(monto)}` : ''
  return `✓  Abrir turno${extra}`
}

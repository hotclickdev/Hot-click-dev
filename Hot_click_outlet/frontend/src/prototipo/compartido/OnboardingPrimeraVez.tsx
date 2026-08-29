import { useState } from 'react'

/**
 * Bienvenida de primera visita por rol. No se muestra de nuevo.
 */
export default function OnboardingPrimeraVez({ rol }: { rol: string }) {
  const clave = `hc-onboarding-${rol}-v1`
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(clave) !== '1'
    } catch {
      return false
    }
  })

  if (!visible) return null

  function cerrar() {
    try {
      localStorage.setItem(clave, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div className="mb-4 w-full rounded-xl px-4 py-3 text-left" style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-blue-700)' }}>
      <p className="text-sm font-semibold">Tu primer paso</p>
      <p className="mt-1 text-xs">Subí un producto, revisá pedidos y abrí la caja cuando estés listo para vender.</p>
      <button type="button" className="mt-2 min-h-11 text-sm font-bold underline" onClick={cerrar}>
        Entendido
      </button>
    </div>
  )
}

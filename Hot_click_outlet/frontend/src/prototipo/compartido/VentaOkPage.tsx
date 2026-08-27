import { useLocation } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { Boton, IconoEstado } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Venta registrada (Figma 73:330).
 */
export default function VentaOkPage() {
  const ruta = useSellerRuta()
  const location = useLocation()
  const state = (location.state as { total?: number; metodo?: string } | null) ?? {}
  const total = state.total ?? 46900
  const metodo = (state.metodo ?? 'efectivo').toLowerCase()
  return (
    <main className="px-5 pb-8 pt-32 text-center">
      <IconoEstado variante="ok" />
      <h1 className="font-display text-xl font-bold">Venta registrada</h1>
      <p className="mt-2 text-sm text-hc-muted">
        Cobraste {formatoColon(total)} en {metodo}. El ticket ya se descontó de tu inventario.
      </p>
      <div className="mt-8 space-y-3">
        <Boton to={ruta('pos')}>Nueva venta</Boton>
        <Boton variante="contorno" to={ruta('reportes')}>Ver en Reportes</Boton>
      </div>
    </main>
  )
}

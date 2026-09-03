import { useLocation } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { Boton } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import PantallaExitoWizard from './motion/PantallaExitoWizard'

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
    <main className="px-5 pb-8 pt-20">
      <PantallaExitoWizard
        titulo="Venta registrada"
        mensaje={`Cobraste ${formatoColon(total)} en ${metodo}. El ticket ya se descontó de tu inventario.`}
        accion={
          <div className="space-y-3">
            <Boton to={ruta('pos')}>Nueva venta</Boton>
            <Boton variante="contorno" to={ruta('reportes')}>Ver en Reportes</Boton>
          </div>
        }
      />
    </main>
  )
}
